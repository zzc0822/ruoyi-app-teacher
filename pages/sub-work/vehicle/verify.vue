<template>
  <view class="verify-page">
    <!-- 登记信息展示 -->
    <view class="info-card">
      <view class="card-title">登记信息</view>
      <view class="info-row">
        <text class="info-label">学生</text>
        <text class="info-value">{{ detail.studentName }}（{{ detail.xh }}）</text>
      </view>
      <view class="info-row">
        <text class="info-label">班级</text>
        <text class="info-value">{{ detail.className }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">车辆类型</text>
        <text class="info-value">{{ getVehicleTypeText(detail.vehicleType) }}</text>
      </view>
      <view class="info-row" v-if="detail.plateNo">
        <text class="info-label">车牌号</text>
        <text class="info-value">{{ detail.plateNo }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">申请理由</text>
        <text class="info-value">{{ detail.applyReason }}</text>
      </view>
    </view>

    <!-- 佐证材料：车辆/驾驶证/行驶证/身份证与其他材料合并成一组 -->
    <view class="info-card">
      <view class="card-title">佐证材料</view>
      <view class="photo-grid" v-if="materialUrls.length">
        <image
          v-for="(url, idx) in materialUrls"
          :key="'m' + idx"
          :src="url"
          class="photo-img"
          mode="aspectFill"
          @click="previewMaterial(idx)"
        />
      </view>
      <text class="empty-tip" v-else>暂无佐证材料</text>
    </view>

    <!-- 现场核实（与外宿核实共用取证面板） -->
    <verify-capture
      ref="capture"
      scene-code="vehicle"
      :photos.sync="verifyPhotoList"
      :remark.sync="verifyRemark"
      tip="请到现场核实车辆实际停放情况，拍摄3-5张核实照片"
    />

    <!-- 操作按钮 -->
    <view class="action-bar">
      <view class="action-btn reject-btn" @click="doVerify('rejected')">
        <text class="action-text">驳回</text>
      </view>
      <view class="action-btn pass-btn" @click="doVerify('verified')">
        <text class="action-text">通过</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getVehicle, verifyVehicle } from '@/api/affair/vehicle'
import { mergePhotoFields } from '@/utils/image'
import verifyCapture from '@/components/verify-capture/index.vue'

export default {
  components: { verifyCapture },
  data() {
    return {
      id: null,
      detail: {},
      verifyPhotoList: [],
      verifyRemark: ''
    }
  },
  computed: {
    materialUrls() {
      const d = this.detail
      return mergePhotoFields(
        d.vehiclePhoto,
        d.drivingLicense,
        d.vehicleLicense,
        d.idCardPhoto,
        d.extraMaterials
      )
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadDetail()
  },
  methods: {
    async loadDetail() {
      try {
        const res = await getVehicle(this.id)
        if (res.data) {
          this.detail = res.data
        }
      } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    previewMaterial(idx) {
      uni.previewImage({ current: idx, urls: this.materialUrls })
    },
    getVehicleTypeText(type) {
      const map = { motorcycle: '摩托车', electric_bike: '电动车', bicycle: '自行车', car: '汽车' }
      return map[type] || type
    },
    doVerify(status) {
      if (status === 'verified' && !this.$refs.capture.ensurePhotoCount()) return

      const actionText = status === 'verified' ? '通过' : '驳回'
      uni.showModal({
        title: '确认' + actionText,
        content: status === 'verified' ? '确认该车辆现场核实通过？' : '确认驳回该车辆登记？',
        success: async (modalRes) => {
          if (!modalRes.confirm) return
          try {
            const data = {
              id: this.id,
              verifyStatus: status,
              verifyPhotos: JSON.stringify(this.verifyPhotoList),
              verifyRemark: this.verifyRemark
            }
            const res = await verifyVehicle(data)
            if (res.code === 200) {
              uni.showToast({ title: '核实' + actionText + '成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1500)
            }
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  background: #f5f6f8;
  padding-bottom: 140rpx;
}
.info-card {
  background: #fff;
  margin: 20rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
  padding-left: 12rpx;
  border-left: 6rpx solid #667eea;
}
.info-row {
  display: flex;
  margin-bottom: 12rpx;
}
.info-label {
  font-size: 26rpx;
  color: #999;
  width: 140rpx;
  flex-shrink: 0;
}
.info-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.photo-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
}
.empty-tip {
  font-size: 24rpx;
  color: #bbb;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  gap: 20rpx;
}
.action-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 12rpx;
}
.reject-btn {
  background: #fff5f5;
  border: 2rpx solid #f56c6c;
}
.reject-btn .action-text {
  color: #f56c6c;
  font-size: 30rpx;
  font-weight: 500;
}
.pass-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.pass-btn .action-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 500;
}
</style>
