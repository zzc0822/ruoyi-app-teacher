<template>
	<view class="container">
		<view class="page-body">
			<!-- 证件照预览 -->
			<view class="photo-preview">
				<image v-if="imageSrc" :src="imageSrc" mode="aspectFill" class="preview-image"></image>
				<view v-else class="preview-placeholder">
					<uni-icons type="camera" size="60" color="#ccc"></uni-icons>
					<text class="placeholder-text">点击选择证件照</text>
				</view>
			</view>
			
			<!-- 操作按钮 -->
			<view class="action-buttons">
				<button type="primary" @click="selectPhoto" class="btn-select">
					<uni-icons type="image" size="20" color="#fff"></uni-icons>
					<text>选择照片</text>
				</button>
				<button type="warn" @click="uploadPhoto" :disabled="!imageSrc || uploading" class="btn-upload">
					<uni-icons type="upload" size="20" color="#fff"></uni-icons>
					<text>{{ uploading ? '上传中...' : '上传证件照' }}</text>
				</button>
			</view>
			
			<!-- 提示信息 -->
			<view class="tips-section">
				<uni-notice-bar 
					single 
					text="请上传本人近期证件照，支持jpg、png格式，大小不超过5MB" 
					backgroundColor="#fff7e6"
					color="#ff6600"
				></uni-notice-bar>
			</view>
		</view>
	</view>
</template>

<script>
  import config from '@/config'
  import { uploadTeacherPhoto } from '@/api/stumanage/attachment'
  import { updateMyTeacherinfo, getTeacherinfoByUserId } from '@/api/stumanage/teacherinfo'
  
  export default {
    data() {
      return {
        imageSrc: '', // 选择的照片
        teacherInfo: null, // 教师信息
        uploading: false // 上传中状态
      }
    },
    onLoad() {
      this.loadTeacherInfo()
    },
    methods: {
      // 加载教师信息
      loadTeacherInfo() {
        const userId = this.$store.state.user.id
        if (!userId) return
        
        getTeacherinfoByUserId(userId).then(res => {
          this.teacherInfo = res.data
          // 如果有证件照，显示
          if (this.teacherInfo.photo) {
            this.imageSrc = config.baseUrl + '/profile' + this.teacherInfo.photo
          }
        }).catch(err => {
          // 加载失败静默处理
        })
      },
      // 选择照片
      selectPhoto() {
        uni.chooseImage({
          count: 1, // 只能选1张
          sizeType: ['compressed'], // 压缩图
          sourceType: ['album', 'camera'], // 相册或相机
          success: (res) => {
            this.imageSrc = res.tempFilePaths[0]
          },
          fail: (err) => {
            // 用户取消选择
          }
        })
      },
      // 上传证件照
      uploadPhoto() {
        if (!this.imageSrc) {
          uni.showToast({ title: '请先选择照片', icon: 'none' })
          return
        }
        
        if (this.uploading) return
        this.uploading = true
        
        uni.showLoading({ title: '上传中...' })
        
        // 使用附件上传工具
        uploadTeacherPhoto(this.imageSrc).then(res => {
          // 更新教师信息的 photo 字段
          // 后端返回的路径可能是：/teacher/photo/2026/05/xxx.jpg
          const photoPath = res.data || res.imgUrl || res.url
          
          if (photoPath && this.teacherInfo) {
            this.updateTeacherPhoto(photoPath)
          } else {
            uni.hideLoading()
            uni.showToast({ title: '上传失败：未获取到照片路径', icon: 'error' })
          }
        }).catch(err => {
          uni.hideLoading()
          uni.showToast({ title: '上传失败', icon: 'error' })
        }).finally(() => {
          this.uploading = false
        })
      },
      // 更新教师信息中的照片路径
      updateTeacherPhoto(photoPath) {
        const updateData = {
          jsid: this.teacherInfo.jsid,
          photo: photoPath
        }
        
        updateMyTeacherinfo(updateData).then(res => {
          // 更新本地缓存的照片路径（加上/profile前缀）
          this.imageSrc = config.baseUrl + '/profile' + photoPath
          
          uni.hideLoading()
          uni.showToast({ title: '上传成功', icon: 'success' })
          
          // 延迟返回，让用户看到成功提示
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }).catch(err => {
          uni.hideLoading()
          uni.showToast({ title: '更新失败', icon: 'error' })
        })
      }
    }
  }
</script>

<style lang="scss" scoped>
	.container {
		min-height: 100vh;
		background: #f5f6f7;
	}
	
	.page-body {
		padding: 40rpx;
	}
	
	// 照片预览区
	.photo-preview {
		background: #fff;
		border-radius: 16rpx;
		padding: 40rpx;
		margin-bottom: 40rpx;
		box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.08);
		
		.preview-image {
			width: 100%;
			height: 600rpx;
			border-radius: 12rpx;
			border: 2rpx solid #e8e8e8;
		}
		
		.preview-placeholder {
			width: 100%;
			height: 600rpx;
			border-radius: 12rpx;
			border: 2rpx dashed #d9d9d9;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			background: #fafafa;
			
			.placeholder-text {
				margin-top: 20rpx;
				color: #999;
				font-size: 28rpx;
			}
		}
	}
	
	// 操作按钮
	.action-buttons {
		display: flex;
		gap: 20rpx;
		margin-bottom: 40rpx;
		
		button {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10rpx;
			border-radius: 12rpx;
			height: 88rpx;
			font-size: 30rpx;
			
			&[disabled] {
				opacity: 0.5;
			}
		}
		
		.btn-select {
			background: linear-gradient(135deg, #667eea, #764ba2);
			color: #fff;
			border: none;
		}
		
		.btn-upload {
			background: linear-gradient(135deg, #f093fb, #f5576c);
			color: #fff;
			border: none;
		}
	}
	
	// 提示信息
	.tips-section {
		margin-top: 40rpx;
	}
</style>
