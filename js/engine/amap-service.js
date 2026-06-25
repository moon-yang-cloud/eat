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
      s.src = `https://webapi.amap.com/maps?v=2.0&key=${CONFIG.AMAP_KEY}&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.CitySearch`;
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
   * 周边餐饮检索
   * @returns {Promise<Array>} 归一化后的 POI 列表
   */
  searchNearby(keyword, center, radius) {
    return new Promise((resolve, reject) => {
      AMap.plugin("AMap.PlaceSearch", () => {
        const ps = new AMap.PlaceSearch({
          type: "餐饮服务",
          pageSize: 50,
          pageIndex: 1,
          extensions: "base",
        });
        ps.searchNearBy(keyword || "", center, radius, (status, result) => {
          if (status === "complete" && result.poiList && result.poiList.pois) {
            const pois = result.poiList.pois.map((p) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              address: p.address,
              location:
                p.location && p.location.lng != null
                  ? [p.location.lng, p.location.lat]
                  : null,
              distance: p.distance != null ? p.distance : p.distanceToCenter || null,
            }));
            resolve(pois);
          } else {
            resolve([]); // 无结果不视为错误
          }
        });
      });
    });
  },
};

if (typeof window !== "undefined") window.AmapService = AmapService;
