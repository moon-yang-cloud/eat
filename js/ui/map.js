/**
 * 地图视图
 * ---------------------------------------------------------------------------
 * 在高德地图上展示用户位置与周边店铺标记，点击标记弹出店铺信息窗。
 * 地图实例懒加载：仅在首次切到地图视图（容器可见）时创建，避免在隐藏容器
 * 上初始化导致的尺寸异常。
 * ---------------------------------------------------------------------------
 */

const MapView = {
  map: null,
  markers: [],
  infoWindow: null,

  /** 确保地图已创建（容器需可见且有高度） */
  ensure(containerId, center) {
    if (typeof AMap === "undefined") return null;
    if (!this.map) {
      this.map = new AMap.Map(containerId, {
        zoom: 14,
        center: center || [116.397, 39.908],
      });
      this.infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) });
    }
    return this.map;
  },

  /** 渲染用户位置 + 店铺标记 */
  render(pois, center, onClick) {
    if (!this.map) return;
    this.clear();

    if (center) {
      const me = new AMap.Marker({
        position: center,
        content: '<div class="me-dot" title="你的位置"></div>',
        offset: new AMap.Pixel(-8, -8),
        zIndex: 200,
      });
      this.map.add(me);
      this.markers.push(me);
    }

    pois.forEach((p) => {
      if (!p.location) return;
      const marker = new AMap.Marker({ position: p.location, title: p.name });
      marker.on("click", () => {
        this.infoWindow.setContent(this._info(p));
        this.infoWindow.open(this.map, p.location);
        if (onClick) onClick(p);
      });
      this.map.add(marker);
      this.markers.push(marker);
    });

    if (this.markers.length > 1) {
      this.map.setFitView(this.markers, false, [40, 40, 40, 40]);
    } else if (center) {
      this.map.setCenter(center);
    }
  },

  _info(p) {
    const esc = window.Render ? Render.esc : (s) => s;
    const rating = p.rating != null ? `评分 ${p.rating}　` : "";
    const price = window.Scorer ? Scorer.priceText(p) : "";
    const dist = window.Scorer ? Scorer.distText(p.distance) : "";
    return `<div class="map-info">
      <div class="mi-name">${esc(p.name)}</div>
      <div class="mi-meta">${rating}${price}　${dist}</div>
      <div class="mi-addr">${esc(p.address || "")}</div>
    </div>`;
  },

  clear() {
    if (this.markers.length && this.map) {
      this.map.remove(this.markers);
      this.markers = [];
    }
    if (this.infoWindow) this.infoWindow.close();
  },

  /** 容器尺寸变化（如从隐藏切到显示）后重算 */
  resize() {
    if (this.map) this.map.resize();
  },
};

if (typeof window !== "undefined") window.MapView = MapView;
