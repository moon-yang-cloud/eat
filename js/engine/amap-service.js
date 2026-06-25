/**
 * 高德地图服务封装
 * ---------------------------------------------------------------------------
 * 把高德 JS API 的脚本加载、定位（含 IP 城市兜底）、周边餐饮检索封装成
 * Promise 接口，调用方无需关心回调细节。
 * ---------------------------------------------------------------------------
 */

const AmapService = {
  _loaded: false,

  /** 动态加载高德脚本（只加载一次） */
  load() {
    return new Promise((resolve, reject) => {
      if (this._loaded && window.AMap) return resolve();
      if (window.AMap) {
        this._loaded = true;
        return resolve();
      }
      window._AMapSecurityConfig = { securityJsCode: CONFIG.AMAP_SECURITY_CODE };
      const s = document.createElement("script");
      s.src = `https://webapi.amap.com/maps?v=2.0&key=${CONFIG.AMAP_KEY}&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.CitySearch,AMap.Geocoder`;
      s.onload = () => { this._loaded = true; resolve(); };
      s.onerror = () => reject(new Error("高德脚本加载失败，请检查 Key 是否正确、网络是否正常"));
      document.head.appendChild(s);
    });
  },

  /**
   * 精确定位，失败时回退到 IP 城市定位
   * @returns {Promise<{center:number[], address:string, approx:boolean}>}
   */
  locate() {
    return new Promise((resolve, reject) => {
      AMap.plugin("AMap.Geolocation", () => {
        const geo = new AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: CONFIG.GEO_TIMEOUT,
          GeoLocationFirst: true,
        });
        geo.getCurrentPosition((status, result) => {
          if (status === "complete" && result.position) {
            resolve({
              center: [result.position.lng, result.position.lat],
              address:
                result.formattedAddress ||
                `${result.position.lng.toFixed(4)}, ${result.position.lat.toFixed(4)}`,
              approx: false,
            });
          } else {
            this._ipFallback().then(resolve).catch(reject);
          }
        });
      });
    });
  },

  /** IP 城市级兜底定位 */
  _ipFallback() {
    return new Promise((resolve, reject) => {
      AMap.plugin("AMap.CitySearch", () => {
        const cs = new AMap.CitySearch();
        cs.getLocalCity((status, result) => {
          if (status === "complete" && result.bounds) {
            const c = result.bounds.getCenter();
            resolve({
              center: [c.lng, c.lat],
              address: `已按城市定位：${result.city}（精度较低）`,
              approx: true,
            });
          } else {
            reject(new Error("定位失败，请检查定位权限或网络后重试。"));
          }
        });
      });
    });
  },

  /**
   * 地名 → 坐标（地理编码），用于"搜索某个地点附近"
   * @param {string} address 地名，如 "中关村" "哈工大"
   * @returns {Promise<{center:number[], address:string}>}
   */
  geocode(address) {
    return new Promise((resolve, reject) => {
      AMap.plugin("AMap.Geocoder", () => {
        const geocoder = new AMap.Geocoder({});
        geocoder.getLocation(address, (status, result) => {
          if (status === "complete" && result.geocodes && result.geocodes.length) {
            const g = result.geocodes[0];
            resolve({
              center: [g.location.lng, g.location.lat],
              address: g.formattedAddress || address,
            });
          } else {
            reject(new Error("找不到这个地点，换个更具体的说法试试（可带上城市名）"));
          }
        });
      });
    });
  },

  /**
   * 周边餐饮检索（支持分页与丰富字段）
   * @param {string} keyword 关键词，可空
   * @param {number[]} center [lng,lat]
   * @param {number} radius 半径（米）
   * @param {number} page 页码（从 1 开始）
   * @returns {Promise<{pois:Array, total:number, hasMore:boolean}>}
   */
  searchNearby(keyword, center, radius, page = 1) {
    const pageSize = (typeof CONFIG !== "undefined" && CONFIG.PAGE_SIZE) || 25;
    return new Promise((resolve, reject) => {
      AMap.plugin("AMap.PlaceSearch", () => {
        const ps = new AMap.PlaceSearch({
          type: "餐饮服务",
          pageSize: pageSize,
          pageIndex: page,
          extensions: "all", // 取详细信息：评分、人均、电话、图片等
        });
        ps.searchNearBy(keyword || "", center, radius, (status, result) => {
          if (status === "complete" && result.poiList && result.poiList.pois) {
            const list = result.poiList.pois;
            const total = result.poiList.count || list.length;
            const pois = list.map((p) => this._normalize(p));
            const loaded = (page - 1) * pageSize + list.length;
            resolve({ pois, total, hasMore: loaded < total && list.length > 0 });
          } else if (status === "no_data") {
            resolve({ pois: [], total: 0, hasMore: false });
          } else {
            const msg = typeof result === "string" ? result : (result && result.info) || "未知错误";
            reject(new Error("高德检索失败：" + msg));
          }
        });
      });
    });
  },

  /** 把高德 POI 归一化为内部结构，尽量提取真实评分/人均/电话/图片 */
  _normalize(p) {
    const ext = p.biz_ext || {};
    const num = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    let photo = null;
    if (Array.isArray(p.photos) && p.photos.length && p.photos[0].url) photo = p.photos[0].url;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      address: p.address,
      tel: (p.tel && String(p.tel)) || "",
      location:
        p.location && p.location.lng != null ? [p.location.lng, p.location.lat] : null,
      distance: p.distance != null ? p.distance : p.distanceToCenter || null,
      rating: num(ext.rating), // 真实评分（可能为 null）
      cost: num(ext.cost), // 真实人均（可能为 null）
      openTime: ext.open_time || ext.opentime || "",
      photo: photo,
    };
  },
};

if (typeof window !== "undefined") window.AmapService = AmapService;
