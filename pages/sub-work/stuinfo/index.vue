<template>
  <view class="page-container">
    <!-- 书记角色：专业统计视图 -->
    <template v-if="isSecretaryRole">
    <template v-if="!isSecretarySidebar">
      <scroll-view scroll-y class="secretary-scroll-view">
        <!-- 学院汇总卡片 -->
        <view class="summary-cards">
          <!-- 总人数 + 男生/女生 -->
          <view class="summary-card-item summary-card-main" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <view class="card-content">
              <view class="card-row">
                <text class="card-label-top">总人数</text>
                <text class="card-num-big">{{ summaryData.totalStudents }}</text>
              </view>
              <view class="card-row-sub">
                <view class="sub-item">
                  <text class="sub-num">{{ summaryData.maleCount }}</text>
                  <text class="sub-label">男生</text>
                </view>
                <view class="sub-divider"></view>
                <view class="sub-item">
                  <text class="sub-num">{{ summaryData.femaleCount }}</text>
                  <text class="sub-label">女生</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 党员/团员/群众 -->
          <view class="summary-card-item summary-card-main" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <view class="card-content">
              <view class="card-row">
                <text class="card-label-top">政治面貌</text>
              </view>
              <view class="card-row-sub">
                <view class="sub-item">
                  <text class="sub-num">{{ summaryData.partyMemberCount }}</text>
                  <text class="sub-label">党员</text>
                </view>
                <view class="sub-divider"></view>
                <view class="sub-item">
                  <text class="sub-num">{{ summaryData.leagueMemberCount }}</text>
                  <text class="sub-label">团员</text>
                </view>
                <view class="sub-divider"></view>
                <view class="sub-item">
                  <text class="sub-num">{{ summaryData.massCount }}</text>
                  <text class="sub-label">群众</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 班级分布+总数 -->
          <view class="summary-card-item summary-card-main" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <view class="card-content">
              <view class="card-row">
                <text class="card-label-top">班级总数</text>
                <text class="card-num-big">{{ summaryData.totalClasses }}</text>
              </view>
              <view class="card-row-sub" v-if="gradeClassStats.length > 0">
                <view class="sub-item" v-for="(grade, index) in gradeClassStats" :key="index">
                  <text class="sub-num">{{ grade.classCount }}</text>
                  <text class="sub-label">{{ grade.grade.substring(2, 4) }}</text>
                </view>
              </view>
              <view class="card-row-sub" v-else>
                <text class="empty-text">暂无数据</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 搜索栏 -->
        <view class="search-section">
          <view class="search-bar">
            <uni-easyinput 
              v-model="searchKey" 
              placeholder="搜索学生姓名/学号/专业/班级" 
              @confirm="handleSearch" 
              @input="onSearchInput"
              clearable 
              @clear="handleClear"
            >
              <template #right>
                <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
              </template>
            </uni-easyinput>
          </view>
          
          <!-- 搜索筛选 -->
          <view class="filter-bar" v-if="searchKey">
            <view class="filter-chip" @click="searchType = 'all'" :class="{ active: searchType === 'all' }">全部</view>
            <view class="filter-chip" @click="searchType = 'student'" :class="{ active: searchType === 'student' }">学生</view>
            <view class="filter-chip" @click="searchType = 'major'" :class="{ active: searchType === 'major' }">专业</view>
            <view class="filter-chip" @click="searchType = 'class'" :class="{ active: searchType === 'class' }">班级</view>
          </view>
        </view>
        
        <!-- 图表统计区域 -->
        <view class="charts-section">
          <!-- 按专业统计 - 横向柱状图 -->
          <view class="chart-card">
            <view class="chart-header">
              <text class="chart-title">按专业统计</text>
              <text class="chart-subtitle">{{ majorStats.length }}个专业</text>
            </view>
            <view class="major-bar-chart">
              <view class="major-bar-item" v-for="(item, index) in majorStats" :key="index">
                <view class="major-bar-info">
                  <text class="major-bar-name">{{ item.majorName }}</text>
                  <text class="major-bar-class-count" v-if="item.classCount > 0">{{ item.classCount }}个班</text>
                  <!-- 男女生人数显示在专业名称同一行 -->
                  <text class="gender-male">♂{{ item.maleCount || 0 }}</text>
                  <text class="gender-female">♀{{ item.femaleCount || 0 }}</text>
                </view>
                <view class="major-bar-wrapper">
                  <view class="major-bar-bg">
                    <!-- 男生部分 -->
                    <view class="major-bar-fill male" :style="'width:' + getMajorBarWidth(item.studentCount) * (item.malePercent / 100) + '%'"></view>
                    <!-- 女生部分 -->
                    <view class="major-bar-fill female" :style="'width:' + getMajorBarWidth(item.studentCount) * (item.femalePercent / 100) + '%; margin-left: -1rpx'"></view>
                  </view>
                  <text class="major-bar-value">{{ item.studentCount }}人</text>
                </view>
              </view>
            </view>
          </view>
          
          <!-- 按辅导员统计 -->
          <view class="chart-card">
            <view class="chart-header">
              <text class="chart-title">按辅导员统计</text>
              <text class="chart-subtitle">{{ counselorPieData.length }}位辅导员</text>
            </view>
            <view class="counselor-bar-list" v-if="counselorPieData.length > 0">
              <view class="counselor-bar-item" v-for="(item, index) in displayedCounselors" :key="index">
                <view class="counselor-bar-label">
                  <view class="counselor-bar-dot" :style="'background:' + item.color"></view>
                  <text class="counselor-bar-name">{{ item.name }}</text>
                </view>
                <view class="counselor-bar-row">
                  <view class="counselor-bar-track">
                    <view class="counselor-bar-fill" :style="'width:' + item.percent + '%; background:' + item.color"></view>
                  </view>
                  <text class="counselor-bar-value">{{ item.value }}人</text>
                </view>
              </view>
              <view class="counselor-expand-btn" v-if="counselorPieData.length > 5" @click="toggleCounselorExpand">
                <text class="counselor-expand-text">{{ counselorExpanded ? '收起' : '展开更多' }}</text>
                <uni-icons :type="counselorExpanded ? 'top' : 'bottom'" size="14" color="#2979ff"></uni-icons>
              </view>
            </view>
            <view class="chart-empty" v-else>
              <text class="empty-text">暂无辅导员数据</text>
            </view>
          </view>
        </view>
        
        <!-- 专业统计列表 -->
        <view class="major-section">
          <view class="section-header">
            <text class="section-title">专业详情</text>
            <text class="section-count">{{ majorStats.length }}个专业</text>
          </view>
          
          <view class="major-card" v-for="major in majorStats" :key="major.zydm">
            <!-- 专业头部 - 点击展开/折叠 -->
            <view class="major-header" @click="toggleMajorExpand(major.zydm)">
              <view class="major-info">
                <view class="major-name-row">
                  <text class="major-name">{{ major.majorName }}</text>
                  <text class="major-class-count" v-if="major.classCount > 0">{{ major.classCount }}个班</text>
                </view>
                <text class="major-code">{{ major.zydm }}</text>
              </view>
              <view class="header-right">
                <view class="major-total">
                  <text class="total-num">{{ major.studentCount }}</text>
                  <text class="total-label">人</text>
                </view>
                <uni-icons :type="expandedMajors[major.zydm] ? 'top' : 'bottom'" size="16" color="#999"></uni-icons>
              </view>
            </view>
            
            <!-- 展开内容 -->
            <view v-if="expandedMajors[major.zydm]">
              <!-- 性别统计 -->
              <view class="gender-stats">
              <view class="gender-item male">
                <text class="gender-icon">♂</text>
                <text class="gender-num">{{ major.maleCount || 0 }}</text>
                <text class="gender-label">男生</text>
                <text class="gender-percent">{{ major.malePercent || 0 }}%</text>
              </view>
              <view class="gender-divider"></view>
              <view class="gender-item female">
                <text class="gender-icon">♀</text>
                <text class="gender-num">{{ major.femaleCount || 0 }}</text>
                <text class="gender-label">女生</text>
                <text class="gender-percent">{{ major.femalePercent || 0 }}%</text>
              </view>
            </view>
            
            <!-- 班级统计 -->
            <view class="class-stats">
              <view class="class-stat-item">
                <text class="class-stat-num">{{ major.classCount }}</text>
                <text class="class-stat-label">班级总数</text>
              </view>
              <view class="class-stat-item" v-if="major.gradeClasses && major.gradeClasses.length > 0">
                <text class="class-stat-num">{{ major.gradeClasses.length }}</text>
                <text class="class-stat-label">年级数</text>
              </view>
              <view class="class-stat-item">
                <text class="class-stat-num">{{ major.avgClassSize || 0 }}</text>
                <text class="class-stat-label">平均班额</text>
              </view>
            </view>
            
            <!-- 年级分布 -->
            <view class="grade-distribution" v-if="major.gradeClasses && major.gradeClasses.length > 0">
              <text class="grade-title">年级分布</text>
              <view class="grade-list">
                <view class="grade-item" v-for="grade in major.gradeClasses" :key="grade.grade">
                  <text class="grade-name">{{ grade.grade }}级</text>
                  <text class="grade-classes">{{ grade.classCount }}个班</text>
                  <text class="grade-students">{{ grade.studentCount }}人</text>
                </view>
              </view>
            </view>
            
            <!-- 班级列表 -->
            <view class="class-list-preview" v-if="major.classes && major.classes.length > 0">
              <text class="class-list-title">班级列表</text>
              <view class="class-item" v-for="cls in major.classes" :key="cls.bjdm">
                <view class="class-dot" :style="'background:' + getClassColor(cls)"></view>
                <text class="class-name">{{ cls.bjjc || cls.bjname }}</text>
                <text class="class-count">{{ cls.bcrs }}人</text>
                <text class="class-gender">♂{{ cls.nans || 0 }} ♀{{ cls.nvsh || 0 }}</text>
              </view>
            </view>
            </view>
            <!-- 展开内容结束 -->
          </view>
        </view>
        
        <!-- 搜索结果 -->
        <view class="search-results" v-if="searchResults.length > 0">
          <view class="section-header">
            <text class="section-title">搜索结果</text>
            <text class="section-count">{{ searchResults.length }}条</text>
          </view>
          
          <view class="result-card" v-for="(item, index) in searchResults" :key="index" @click="handleResultClick(item)">
            <view class="result-header">
              <view :class="['result-badge', 'badge-' + item.type]">
                {{ item.type === 'student' ? '学生' : item.type === 'major' ? '专业' : '班级' }}
              </view>
              <text class="result-title">{{ item.title }}</text>
            </view>
            <text class="result-desc" v-if="item.desc">{{ item.desc }}</text>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- 书记侧边栏：专业→班级分层导航 -->
    <template v-else>
    <view class="secretary-sidebar">
      <scroll-view scroll-y class="sidebar-scroll">
        <view class="tree-overview" :class="{ active: activeBjdm === '' }" @click="selectClass('')">
          <text class="tree-overview-text">总览</text>
          <text class="tree-overview-count">{{ classList.length }}个班</text>
        </view>
        <view class="major-group" v-for="(major, mIdx) in secretaryClassTree" :key="major.zydm">
          <view class="major-header-tree" @click="toggleSecretaryMajor(major.zydm)">
            <text class="major-expand-icon">{{ secretaryExpandedMajors[major.zydm] ? '▼' : '▶' }}</text>
            <text class="major-tree-name">{{ major.majorName }}</text>
            <text class="major-tree-count">{{ major.totalStudents }}人</text>
          </view>
          <view v-if="secretaryExpandedMajors[major.zydm]" class="class-tree-list">
            <view class="class-tree-item" :class="{ active: activeBjdm === cls.bjdm }"
              v-for="cls in major.classes" :key="cls.bjdm" @click="selectClass(cls.bjdm)">
              <view class="class-tree-dot" :style="'background:' + classColors[mIdx % classColors.length]"></view>
              <text class="class-tree-name">{{ cls.bjjc || cls.bjname }}</text>
              <text class="class-tree-count">{{ cls.bcrs || 0 }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    <scroll-view scroll-y class="main-area" :scroll-top="scrollTop" @scroll="onScroll">
      <!-- 总览模式 -->
      <template v-if="activeBjdm === ''">
        <view class="teacher-stats-section">
          <view class="teacher-stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <view class="tsc-content">
              <view class="tsc-row">
                <text class="tsc-label">总人数</text>
                <text class="tsc-num">{{ teacherStats.totalStudents }}</text>
              </view>
              <view class="tsc-sub">
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.maleCount }}</text>
                  <text class="tsc-sub-label">♂ 男生</text>
                </view>
                <view class="tsc-sub-divider"></view>
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.femaleCount }}</text>
                  <text class="tsc-sub-label">♀ 女生</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="search-bar">
          <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="handleSearch" clearable @clear="handleSearch">
            <template #right>
              <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
            </template>
          </uni-easyinput>
        </view>
        <view class="card" v-if="searchResults.length > 0">
          <text class="card-title">搜索结果 ({{ searchResults.length }})</text>
          <view class="stu-row" v-for="(stu, idx) in searchResults" :key="stu.xh" @click="showDetail(stu)">
            <text class="stu-name link">{{ stu.studentName }}</text>
            <text :class="['stu-sex', stu.genderName === '男' ? 'male' : stu.genderName === '女' ? 'female' : 'unknown']">{{ stu.genderName === '男' ? '♂' : stu.genderName === '女' ? '♀' : '?' }}</text>
            <text class="stu-xh">{{ stu.xh }}</text>
            <text class="stu-zzmm">{{ stu.zzmmName || '-' }}</text>
            <text class="stu-cls">{{ stu.className }}</text>
          </view>
        </view>
      </template>
      <!-- 单班级模式 -->
      <template v-else>
        <view class="search-bar">
          <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="handleSearch" clearable @clear="handleSearch">
            <template #right>
              <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
            </template>
          </uni-easyinput>
        </view>
        <view class="class-head">
          <view class="ch-row1">
            <view class="ch-dot" :style="'background:' + activeClassColor"></view>
            <text class="ch-name">{{ activeClass.bjname }}</text>
          </view>
          <view class="ch-row2">
            <text class="ch-gender">♂{{ activeClass.nans || 0 }} ♀{{ activeClass.nvsh || 0 }} 共{{ activeClass.bcrs || 0 }}人</text>
          </view>
        </view>
        <view class="card" v-if="classLeaves.length > 0">
          <text class="card-title">今日请假 ({{ classLeaves.length }})</text>
          <view class="leave-row" v-for="(item, idx) in classLeaves" :key="idx">
            <text class="lr-name">{{ item.studentName }}</text>
            <text class="lr-type">{{ formatLeaveType(item.leaveType) }}</text>
            <text class="lr-days">{{ item.leaveDays }}天</text>
          </view>
        </view>
        <view class="card student-list-card">
          <text class="card-title">学生名单 ({{ filteredStudents.length }})</text>
          <view class="stu-row" v-for="(stu, idx) in filteredStudents" :key="stu.xh" @click="showDetail(stu)">
            <view class="stu-row-main">
              <text class="stu-idx">{{ idx + 1 }}</text>
              <text class="stu-name link">{{ stu.studentName }}</text>
              <text :class="['stu-sex', stu.genderName === '男' ? 'male' : stu.genderName === '女' ? 'female' : 'unknown']">{{ stu.genderName === '男' ? '♂' : stu.genderName === '女' ? '♀' : '?' }}</text>
              <text class="stu-zzmm">{{ stu.zzmmName || '政治面貌未录入' }}</text>
              <text :class="['stu-status', isOnLeave(stu.xh) ? 'on-leave' : 'on-campus']">
                {{ isOnLeave(stu.xh) ? '请假' : '在校' }}
              </text>
              <view
                class="stu-portrait-btn"
                role="button"
                aria-label="查看学生画像"
                @click.stop="showDetail(stu, 'portrait')"
              >
                <text>画像</text>
              </view>
            </view>
            <view class="stu-row-meta">
              <text class="stu-xh">学号 {{ stu.xh }}</text>
              <view class="stu-phone">
                <uni-icons type="phone" size="12" color="#64748b"></uni-icons>
                <text class="stu-phone-label">电话</text>
                <text>{{ stu.phone || '未录入' }}</text>
              </view>
            </view>
          </view>
          <view class="empty-tip" v-if="filteredStudents.length === 0">
            <text>无匹配学生</text>
          </view>
        </view>
      </template>
    </scroll-view>
    </template>
    </template>
    
    <!-- 普通教师：原有班级视图 -->
    <template v-else>
    <!-- 左侧班级窄条 -->
    <view class="sidebar" :class="sidebarExpanded ? 'expanded' : 'collapsed'">
      <!-- 展开/收缩按钮 -->
      <view class="side-toggle" @click="toggleSidebar">
        <uni-icons :type="sidebarExpanded ? 'left' : 'right'" size="14" color="#999"></uni-icons>
      </view>
      <!-- 总览 -->
      <view
        class="side-item"
        :class="{ active: activeBjdm === '' }"
        @click="selectClass('')"
      >
        <view class="side-bar bar-all" :class="{ 'bar-active': activeBjdm === '' }"></view>
        <text class="side-text" v-if="sidebarExpanded">总览</text>
      </view>
      <!-- 各班级 -->
      <view
        v-for="(cls, idx) in classList"
        :key="cls.bjdm"
        class="side-item"
        :class="{ active: activeBjdm === cls.bjdm }"
        @click="selectClass(cls.bjdm)"
      >
        <view class="side-bar" :class="{ 'bar-active': activeBjdm === cls.bjdm }" :style="'background:' + classColors[idx % classColors.length]"></view>
        <text class="side-text" v-if="sidebarExpanded">{{ cls.bjjc || (cls.bjname && cls.bjname.substring(0, 6)) }}</text>
        <text class="side-sub" v-if="sidebarExpanded">{{ cls.bcrs || 0 }}</text>
      </view>
    </view>

    <!-- 右侧主区域 -->
    <scroll-view scroll-y class="main-area" :scroll-top="scrollTop" @scroll="onScroll">
      <!-- ====== 总览模式 ====== -->
      <template v-if="activeBjdm === ''">
        <!-- 统计汇总模块 -->
        <view class="teacher-stats-section">
          <!-- 总人数 + 性别 -->
          <view class="teacher-stats-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <view class="tsc-content">
              <view class="tsc-row">
                <text class="tsc-label">总人数</text>
                <text class="tsc-num">{{ teacherStats.totalStudents }}</text>
              </view>
              <view class="tsc-sub">
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.maleCount }}</text>
                  <text class="tsc-sub-label">♂ 男生</text>
                </view>
                <view class="tsc-sub-divider"></view>
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.femaleCount }}</text>
                  <text class="tsc-sub-label">♀ 女生</text>
                </view>
              </view>
            </view>
          </view>
          <!-- 政治面貌 -->
          <view class="teacher-stats-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <view class="tsc-content">
              <view class="tsc-row">
                <text class="tsc-label">政治面貌</text>
              </view>
              <view class="tsc-sub">
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.partyMember }}</text>
                  <text class="tsc-sub-label">党员</text>
                </view>
                <view class="tsc-sub-divider"></view>
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.leagueMember }}</text>
                  <text class="tsc-sub-label">团员</text>
                </view>
                <view class="tsc-sub-divider"></view>
                <view class="tsc-sub-item">
                  <text class="tsc-sub-num">{{ teacherStats.mass }}</text>
                  <text class="tsc-sub-label">群众</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-bar">
          <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="handleSearch" clearable @clear="handleSearch">
            <template #right>
              <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
            </template>
          </uni-easyinput>
        </view>

        <!-- 班级列表 -->
        <view class="card" v-if="classList.length > 0">
          <text class="card-title">我的班级 ({{ classList.length }}个班)</text>
          <view class="class-summary-item" v-for="(cls, idx) in classList" :key="cls.bjdm" @click="selectClass(cls.bjdm)">
            <view class="csi-bar" :style="'background:' + classColors[idx % classColors.length]"></view>
            <view class="csi-info">
              <text class="csi-name">{{ cls.bjname || cls.bjjc }}</text>
              <view class="csi-detail">
                <text class="csi-gender">♂{{ cls.nans || 0 }} ♀{{ cls.nvsh || 0 }}</text>
                <text class="csi-total">共{{ cls.bcrs || 0 }}人</text>
              </view>
            </view>
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
        </view>

        <!-- 搜索结果 -->
        <view class="card" v-if="searchResults.length > 0">
          <text class="card-title">搜索结果 ({{ searchResults.length }})</text>
          <view class="stu-row" v-for="(stu, idx) in searchResults" :key="stu.xh" @click="showDetail(stu)">
            <text class="stu-name link">{{ stu.studentName }}</text>
            <text :class="['stu-sex', stu.genderName === '男' ? 'male' : stu.genderName === '女' ? 'female' : 'unknown']">{{ stu.genderName === '男' ? '♂' : stu.genderName === '女' ? '♀' : '?' }}</text>
            <text class="stu-xh">{{ stu.xh }}</text>
            <text class="stu-zzmm">{{ stu.zzmmName || '-' }}</text>
            <text class="stu-cls">{{ stu.className }}</text>
          </view>
        </view>
      </template>

      <!-- ====== 单班级模式 ====== -->
      <template v-else>
        <!-- 搜索框 -->
        <view class="search-bar">
          <uni-easyinput v-model="searchKey" placeholder="搜索姓名/学号" @confirm="handleSearch" clearable @clear="handleSearch">
            <template #right>
              <uni-icons type="search" size="18" @click="handleSearch"></uni-icons>
            </template>
          </uni-easyinput>
        </view>

        <!-- 班级头 -->
        <view class="class-head">
          <view class="ch-row1">
            <view class="ch-dot" :style="'background:' + activeClassColor"></view>
            <text class="ch-name">{{ activeClass.bjname }}</text>
          </view>
          <view class="ch-row2">
            <text class="ch-gender">♂{{ activeClass.nans || 0 }} ♀{{ activeClass.nvsh || 0 }} 共{{ activeClass.bcrs || 0 }}人</text>
          </view>
        </view>

        <!-- 今日请假 -->
        <view class="card" v-if="classLeaves.length > 0">
          <text class="card-title">今日请假 ({{ classLeaves.length }})</text>
          <view class="leave-row" v-for="(item, idx) in classLeaves" :key="idx">
            <text class="lr-name">{{ item.studentName }}</text>
            <text class="lr-type">{{ formatLeaveType(item.leaveType) }}</text>
            <text class="lr-days">{{ item.leaveDays }}天</text>
          </view>
        </view>

        <!-- 学生名单 -->
        <view class="card student-list-card">
          <text class="card-title">学生名单 ({{ filteredStudents.length }})</text>
          <view class="stu-row" v-for="(stu, idx) in filteredStudents" :key="stu.xh" @click="showDetail(stu)">
            <view class="stu-row-main">
              <text class="stu-idx">{{ idx + 1 }}</text>
              <text class="stu-name link">{{ stu.studentName }}</text>
              <text :class="['stu-sex', stu.genderName === '男' ? 'male' : stu.genderName === '女' ? 'female' : 'unknown']">{{ stu.genderName === '男' ? '♂' : stu.genderName === '女' ? '♀' : '?' }}</text>
              <text class="stu-zzmm">{{ stu.zzmmName || '政治面貌未录入' }}</text>
              <text :class="['stu-status', isOnLeave(stu.xh) ? 'on-leave' : 'on-campus']">
                {{ isOnLeave(stu.xh) ? '请假' : '在校' }}
              </text>
              <view
                class="stu-portrait-btn"
                role="button"
                aria-label="查看学生画像"
                @click.stop="showDetail(stu, 'portrait')"
              >
                <text>画像</text>
              </view>
            </view>
            <view class="stu-row-meta">
              <text class="stu-xh">学号 {{ stu.xh }}</text>
              <view class="stu-phone">
                <uni-icons type="phone" size="12" color="#64748b"></uni-icons>
                <text class="stu-phone-label">电话</text>
                <text>{{ stu.phone || '未录入' }}</text>
              </view>
            </view>
          </view>
          <view class="empty-tip" v-if="filteredStudents.length === 0">
            <text>无匹配学生</text>
          </view>
        </view>
      </template>
    </scroll-view>
    </template>
    
    <!-- 学生详情弹窗（所有角色共享） -->
    <view v-if="detailVisible" class="student-detail-overlay" @click="closeDetail">
      <view class="detail-panel" @click.stop>
        <view class="dp-header">
          <view class="dp-title-wrap">
            <text class="dp-title">学生档案</text>
            <text class="dp-title-sub">概况与成长画像</text>
          </view>
          <view class="dp-close" @click="closeDetail">
            <uni-icons type="closeempty" size="20" color="#64748b"></uni-icons>
          </view>
        </view>
        <scroll-view scroll-y class="detail-panel-scroll">
        <view class="dp-body" v-if="detailStu">
          <view class="dp-top">
            <image v-if="detailStu.photo && !detailStu._photoErr" class="dp-photo" :src="stuPhotoUrl(detailStu.photo)" mode="aspectFill" @error="onPhotoError"></image>
            <view v-else class="dp-avatar" :class="detailStu.genderName === '男' ? 'avatar-male' : detailStu.genderName === '女' ? 'avatar-female' : 'avatar-unknown'">
              <text class="dp-avatar-text">{{ (detailStu.studentName && detailStu.studentName.substring(0,1)) || '' }}</text>
            </view>
            <view class="dp-top-info">
              <text class="dp-name">{{ detailStu.studentName }}</text>
              <text class="dp-sub">{{ detailStu.genderName || '未知' }} · {{ detailStu.xh }}</text>
              <view class="dp-top-meta">
                <text class="dp-top-meta-item">{{ detailStu.className || '班级未录入' }}</text>
                <text class="dp-top-meta-item">{{ detailStu.phone || '电话未录入' }}</text>
              </view>
            </view>
          </view>

          <view class="dp-switch">
            <view
              class="dp-switch-item"
              :class="{ active: detailMode === 'overview' }"
              @click="switchDetailMode('overview')"
            >
              <text>概况</text>
            </view>
            <view
              class="dp-switch-item"
              :class="{ active: detailMode === 'portrait' }"
              @click="switchDetailMode('portrait')"
            >
              <text>画像</text>
              <text v-if="portraitWarnings.length" class="dp-switch-badge">{{ portraitWarnings.length }}</text>
            </view>
          </view>

          <!-- 概况：基础信息 + 当前指标 -->
          <view v-if="detailMode === 'overview'" class="dp-overview">
            <view class="dp-section-head">
              <text class="dp-section-title">第二课堂关键指标</text>
              <text class="dp-section-meta">{{ portraitLoading ? '更新中...' : portraitUpdateTime }}</text>
            </view>
            <view v-if="portraitError" class="dp-inline-error" @click="loadStudentPortrait(detailStu.xh, true)">
              <uni-icons type="info" size="14" color="#b45309"></uni-icons>
              <text>{{ portraitError }}，点击重试</text>
            </view>
            <view class="dp-stat-grid">
              <view v-for="item in overviewIndicators" :key="item.key" class="dp-stat-item">
                <text class="dp-stat-value" :class="item.tone">{{ item.value }}</text>
                <text class="dp-stat-label">{{ item.label }}</text>
              </view>
            </view>

            <view class="dp-section-head">
              <text class="dp-section-title">指标取数</text>
              <text class="dp-section-meta">{{ portraitMetrics.length }} 项</text>
            </view>
            <view v-if="portraitMetrics.length" class="dp-metric-list">
              <view v-for="metric in portraitMetrics" :key="metric.metricCode" class="dp-metric-item">
                <view class="dp-metric-main">
                  <text class="dp-metric-name">{{ metric.metricName || metric.metricCode }}</text>
                  <text class="dp-metric-value" :class="{ muted: metric.value == null || metric.computable === false }">{{ formatMetricValue(metric) }}</text>
                </view>
                <view class="dp-metric-foot">
                  <text>{{ formatMetricWindow(metric) }}</text>
                  <text v-if="metric.detail" class="dp-metric-detail">{{ metric.detail }}</text>
                  <text v-else-if="metric.computable === false" class="dp-metric-detail">该指标暂未接入取数</text>
                  <text v-else class="dp-metric-detail">窗口内暂无记录</text>
                </view>
              </view>
            </view>
            <view v-else-if="!portraitLoading" class="dp-empty-line">暂无指标定义</view>

            <view class="dp-section-head">
              <text class="dp-section-title">基本信息</text>
            </view>
            <view class="dp-grid">
              <view class="dp-cell">
                <text class="dp-label">班级</text>
                <text class="dp-value">{{ detailStu.className || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">联系电话</text>
                <text class="dp-value">{{ detailStu.phone || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">专业</text>
                <text class="dp-value">{{ detailStu.majorName || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">学院</text>
                <text class="dp-value">{{ detailStu.collegeName || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">年级</text>
                <text class="dp-value">{{ detailStu.grade || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">宿舍</text>
                <text class="dp-value">{{ detailStu.sssh || '-' }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">民族</text>
                <text class="dp-value">{{ nzText(detailStu.nz) }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">学籍状态</text>
                <text class="dp-value">{{ xjztText(detailStu.xjzt) }}</text>
              </view>
              <view class="dp-cell">
                <text class="dp-label">校区</text>
                <text class="dp-value">{{ detailStu.xq || '-' }}</text>
              </view>
            </view>
          </view>

          <!-- 画像：第二课堂分类、标签与预警 -->
          <view v-else class="dp-portrait">
            <view v-if="portraitLoading" class="dp-state">
              <text>画像加载中...</text>
            </view>
            <view v-else-if="portraitError" class="dp-state dp-state-error" @click="loadStudentPortrait(detailStu.xh, true)">
              <text>{{ portraitError }}</text>
              <text class="dp-retry">点击重试</text>
            </view>
            <template v-else-if="portrait">
              <view class="dp-section-head">
                <text class="dp-section-title">学生概况</text>
                <text class="dp-section-meta">画像基础信息</text>
              </view>
              <view class="dp-profile-context">
                <view class="dp-context-item">
                  <text class="dp-context-label">姓名</text>
                  <text class="dp-context-value">{{ detailStu.studentName || '-' }}</text>
                </view>
                <view class="dp-context-item">
                  <text class="dp-context-label">班级</text>
                  <text class="dp-context-value">{{ detailStu.className || '-' }}</text>
                </view>
                <view class="dp-context-item">
                  <text class="dp-context-label">联系电话</text>
                  <text class="dp-context-value">{{ detailStu.phone || '-' }}</text>
                </view>
                <view class="dp-context-item">
                  <text class="dp-context-label">政治面貌</text>
                  <text class="dp-context-value">{{ detailStu.zzmmName || '-' }}</text>
                </view>
              </view>

              <view class="dp-profile-summary">
                <view class="dp-profile-stat">
                  <text class="dp-profile-num">{{ portraitScoreTotal }}</text>
                  <text class="dp-profile-label">加权成绩</text>
                </view>
                <view class="dp-profile-stat">
                  <text class="dp-profile-num">{{ portraitTags.length }}</text>
                  <text class="dp-profile-label">在标标签</text>
                </view>
                <view class="dp-profile-stat">
                  <text class="dp-profile-num" :class="{ danger: portraitWarnings.length }">{{ portraitWarnings.length }}</text>
                  <text class="dp-profile-label">预警记录</text>
                </view>
              </view>

              <view class="dp-section-head">
                <text class="dp-section-title">第二课堂分类</text>
                <text class="dp-section-meta">{{ portraitUpdateTime }}</text>
              </view>
              <view v-if="hasScoreData" class="dp-score-list">
                <view v-for="item in scoreDimensions" :key="item.key" class="dp-score-item">
                  <view class="dp-score-head">
                    <text class="dp-score-name">{{ item.label }}</text>
                    <text class="dp-score-value" :class="item.tone">{{ item.value == null ? '暂无' : item.value + ' 分' }}</text>
                  </view>
                  <view class="dp-score-track">
                    <view class="dp-score-bar" :class="item.tone" :style="{ width: item.percent + '%' }"></view>
                  </view>
                </view>
              </view>
              <view v-else class="dp-empty-line">暂无第二课堂积分记录</view>

              <view class="dp-section-head">
                <text class="dp-section-title">画像标签</text>
                <text class="dp-section-meta">{{ portraitTags.length }} 个</text>
              </view>
              <view v-if="portraitTags.length" class="dp-tag-list">
                <text
                  v-for="tag in portraitTags"
                  :key="tag.id || tag.tagCode"
                  class="dp-tag"
                  :class="tagTone(tag.tagCategory)"
                >{{ tag.tagName || tag.tagCode }}</text>
              </view>
              <view v-else class="dp-empty-line">暂无在标标签</view>

              <view class="dp-section-head">
                <text class="dp-section-title">预警记录</text>
                <text class="dp-section-meta">待处置 {{ pendingWarningCount }} 条</text>
              </view>
              <view v-if="portraitWarnings.length" class="dp-warning-list">
                <view v-for="warning in portraitWarnings.slice(0, 6)" :key="warning.id" class="dp-warning-item">
                  <view class="dp-warning-head">
                    <text class="dp-warning-level" :class="warningTone(warning.warningLevel)">{{ warningLevelText(warning.warningLevel) }}</text>
                    <text class="dp-warning-type">{{ warningTypeText(warning.warningType) }}</text>
                    <text class="dp-warning-date">{{ warning.warningDate || warning.createTime || '' }}</text>
                  </view>
                  <text class="dp-warning-text">{{ warning.warningContent || warning.warningReason || '预警待复核' }}</text>
                </view>
              </view>
              <view v-else class="dp-empty-line">暂无预警记录</view>
            </template>
            <view v-else class="dp-state">
              <text>暂无可展示的画像数据</text>
            </view>
          </view>
        </view>
        </scroll-view>
      </view>
    </view>

    <!-- 全部班级列表弹窗 -->
    <uni-popup ref="allClassesPopup" type="bottom">
      <view class="all-classes-popup">
        <view class="popup-header">
          <text class="popup-title">{{ currentMajorName }} - 全部班级</text>
          <view class="popup-close" @click="closeAllClassesPopup">
            <uni-icons type="close" size="20" color="#666"></uni-icons>
          </view>
        </view>
        <scroll-view scroll-y class="popup-content">
          <view class="popup-class-item" v-for="cls in currentMajorClasses" :key="cls.bjdm">
            <view class="popup-class-dot" :style="'background:' + getClassColor(cls)"></view>
            <view class="popup-class-info">
              <text class="popup-class-name">{{ cls.bjjc || cls.bjname }}</text>
              <text class="popup-class-detail">{{ cls.bcrs }}人 | ♂{{ cls.nans || 0 }} ♀{{ cls.nvsh || 0 }}</text>
            </view>
            <uni-icons type="right" size="16" color="#ccc"></uni-icons>
          </view>
          <view class="popup-empty" v-if="!currentMajorClasses || currentMajorClasses.length === 0">
            <text>暂无班级数据</text>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getMyClasses, getClassStudents } from '@/api/work/classcheck'
import { listLeave } from '@/api/work/leave'
import { listStuinfo, getCollegeClassTreeByRole, getStudentPortrait } from '@/api/student/stuinfo'
import { getRoleViewConfig } from '@/utils/roleViewConfig'
import { isSecretary } from '@/utils/role'
import { getCollegeSummary, getStatsByMajor, getStatsByCounselor } from '@/api/student/stats'
import { getDicts } from '@/api/system/dict/data'

export default {
  data() {
    return {
      // 视图配置（从数据库加载）
      viewConfig: null,
      // 字典选项（民族、学籍状态）
      mzOptions: [],
      xjztOptions: [],
      classList: [],
      activeBjdm: '',
      sidebarExpanded: true,
      scrollTop: 0,
      oldScrollTop: 0,
      classColors: ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800', '#795548', '#e43d33'],
      // 搜索
      searchKey: '',
      searchResults: [],
      searchType: 'all', // all | student | major | class
      searchTimer: null,
      // 班级详情
      studentList: [],
      classLeaves: [],
      classLeaveCount: 0,
      // 学生详情
      detailVisible: false,
      detailStu: null,
      detailMode: 'overview',
      portrait: null,
      portraitLoading: false,
      portraitError: '',
      // 书记角色相关
      isSecretaryRole: false,
      isSecretarySidebar: false,
      secretaryClassTree: [],
      secretaryExpandedMajors: {},
      summaryData: {
        totalStudents: 0,
        maleCount: 0,
        femaleCount: 0,
        partyMemberCount: 0,    // 中共党员（含预备党员）
        leagueMemberCount: 0,   // 共青团员
        massCount: 0,           // 群众（含其他政治面貌）
        totalClasses: 0
      },
      majorStats: [],
      // 饼图数据
      majorPieData: [],
      counselorPieData: [],
      // 年级班级分布
      gradeClassStats: [],
      // 书记所在学院
      secretaryCollege: null,
      // 专业展开状态
      expandedMajors: {},
      // 辅导员统计展开状态
      counselorExpanded: false,
      // 全部班级弹窗
      currentMajorName: '',
      currentMajorClasses: [],
      // 教师统计汇总
      teacherStats: {
        totalStudents: 0,
        maleCount: 0,
        femaleCount: 0,
        partyMember: 0,
        leagueMember: 0,
        mass: 0
      }
    }
  },
  computed: {
    activeClass() {
      return this.classList.find(c => c.bjdm === this.activeBjdm) || {}
    },
    activeClassColor() {
      const idx = this.classList.findIndex(c => c.bjdm === this.activeBjdm)
      return idx >= 0 ? this.classColors[idx % this.classColors.length] : '#2979ff'
    },
    // 显示的辅导员列表（默认前5名）
    displayedCounselors() {
      if (!this.counselorPieData || this.counselorPieData.length === 0) return []
      if (this.counselorExpanded || this.counselorPieData.length <= 5) {
        return this.counselorPieData
      }
      return this.counselorPieData.slice(0, 5)
    },
    filteredStudents() {
      if (!this.searchKey) return this.studentList
      const key = this.searchKey.trim()
      if (!key) return this.studentList
      return this.studentList.filter(s =>
        (s.studentName && s.studentName.indexOf(key) >= 0) ||
        (s.xh && s.xh.indexOf(key) >= 0)
      )
    },
    portraitStat() {
      return (this.portrait && this.portrait.stat) || {}
    },
    portraitMetrics() {
      return (this.portrait && this.portrait.metrics) || []
    },
    portraitTags() {
      return (this.portrait && this.portrait.tags) || []
    },
    portraitWarnings() {
      return (this.portrait && this.portrait.warnings) || []
    },
    pendingWarningCount() {
      return this.portraitWarnings.filter(warning => Number(warning.isConfirmed) !== 1).length
    },
    portraitScoreTotal() {
      return this.portraitStat.scoreTotal == null ? '—' : this.portraitStat.scoreTotal
    },
    portraitUpdateTime() {
      return this.portraitStat.updateTime || (this.portrait ? '暂无统计' : '')
    },
    overviewIndicators() {
      return this.scoreDimensions.map(item => ({
        key: item.key,
        label: item.label,
        value: this.formatStatValue(item.value, '分'),
        tone: item.tone
      }))
    },
    scoreDimensions() {
      const dimensions = [
        { key: 'de', label: '德育', field: 'scoreDe' },
        { key: 'zhi', label: '智育', field: 'scoreZhi' },
        { key: 'ti', label: '体育', field: 'scoreTi' },
        { key: 'mei', label: '美育', field: 'scoreMei' },
        { key: 'lao', label: '劳育', field: 'scoreLao' },
        { key: 'chuang', label: '双创', field: 'scoreChuang' }
      ]
      return dimensions.map(item => {
        const value = this.toScore(this.portraitStat[item.field])
        return {
          ...item,
          value,
          percent: value == null ? 0 : Math.min(100, Math.max(0, value)),
          tone: this.scoreTone(value)
        }
      })
    },
    hasScoreData() {
      return this.scoreDimensions.some(item => item.value != null)
    }
  },
  async onLoad() {
    this.loadStudentDicts()
    // 从数据库加载角色视图配置
    this.viewConfig = await getRoleViewConfig('stuinfo')
    
    // 根据配置决定显示逻辑（兼容 viewType 和 view_type）
    const viewType = this.viewConfig.viewType || this.viewConfig.view_type || 'class_list'
    
    if (viewType === 'major_stats') {
      // 书记角色：专业统计视图
      this.isSecretaryRole = true
      this.loadSecretaryData()
    } else {
      // 检测是否为书记角色 → 分层侧边栏
      let roles = []
      const store = this.$store
      if (store && store.state && store.state.user && store.state.user.roles) {
        roles = store.state.user.roles
      } else if (store && store.getters && store.getters.roles) {
        roles = store.getters.roles
      }
      if (!roles || (Array.isArray(roles) && roles.length === 0)) {
        try { roles = uni.getStorageSync('user_roles') || [] } catch (e) {}
      }
      if (!Array.isArray(roles)) roles = []
      
      if (isSecretary(roles)) {
        this.isSecretaryRole = true
        this.isSecretarySidebar = true
        this.loadSecretaryClassTree()
      } else {
        this.isSecretaryRole = false
        this.loadClasses()
      }
    }
  },
  methods: {
    loadStudentDicts() {
      getDicts('base_mz').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.mzOptions = options
      }).catch(() => {})
      getDicts('base_xj_status').then(res => {
        const options = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
        if (options.length) this.xjztOptions = options
      }).catch(() => {})
    },
    nzText(nz) {
      if (!nz) return '-'
      const hit = this.mzOptions.find(o => o.value === nz)
      return hit ? hit.label : nz
    },
    xjztText(xjzt) {
      if (!xjzt) return '-'
      const hit = this.xjztOptions.find(o => o.value === xjzt)
      return hit ? hit.label : xjzt
    },
    // 截断文本，超过指定长度显示省略号
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },
    
    // 显示专业的全部班级列表
    showAllClasses(major) {
      this.currentMajorName = major.majorName
      this.currentMajorClasses = major.classes || []
      this.$refs.allClassesPopup.open()
    },
    
    // 关闭全部班级列表弹窗
    closeAllClassesPopup() {
      this.$refs.allClassesPopup.close()
    },
    
    // 加载书记数据
    async loadSecretaryData() {
      try {
        const { getTeacherinfoByUserId } = await import('@/api/stumanage/teacherinfo')
        const res = await getTeacherinfoByUserId()
        if (res.data && res.data.xydm) {
          this.secretaryCollege = res.data.xydm
          // 并行加载所有统计数据
          this.loadAllStats()
        }
      } catch (err) {
        // 获取失败静默处理
      }
    },
    
    // 加载所有统计数据（使用后端 API，前端只做渲染）
    loadAllStats() {
      if (!this.secretaryCollege) return
      
      // 并行请求三个统计 API
      Promise.all([
        getCollegeSummary(this.secretaryCollege),
        getStatsByMajor(this.secretaryCollege),
        getStatsByCounselor(this.secretaryCollege)
      ]).then(([summaryRes, majorRes, counselorRes]) => {
        // 汇总数据：后端已按展示维度聚合，前端直接赋值
        const summary = summaryRes.data || {}
        this.summaryData = {
          totalStudents: summary.totalStudents || 0,
          totalClasses: summary.totalClasses || 0,
          maleCount: summary.maleCount || 0,
          femaleCount: summary.femaleCount || 0,
          partyMemberCount: summary.partyMemberCount || 0,
          leagueMemberCount: summary.leagueMemberCount || 0,
          massCount: summary.massCount || 0
        }
        
        // 专业统计：后端返回 zydm/majorName，增加兜底逻辑
        const colors = ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800', '#795548', '#e43d33', '#607d8b', '#8bc34a']
        
        // 前端去重：按 zydm 合并同名专业（不同培养层次）
        const rawData = majorRes.data || []
        const mergedMap = {}
        rawData.forEach(m => {
          const key = m.zydm || ''
          if (!key) return
          if (!mergedMap[key]) {
            mergedMap[key] = { ...m }
          } else {
            // 合并同 zydm 的数据（累加学生数、班级数等）
            const existing = mergedMap[key]
            existing.studentCount = (existing.studentCount || 0) + (m.studentCount || 0)
            existing.activeCount = (existing.activeCount || 0) + (m.activeCount || 0)
            existing.classCount = (existing.classCount || 0) + (m.classCount || 0)
            existing.maleCount = (existing.maleCount || 0) + (m.maleCount || 0)
            existing.femaleCount = (existing.femaleCount || 0) + (m.femaleCount || 0)
            // 保留第一个专业名称
            if (!existing.majorName && m.majorName) existing.majorName = m.majorName
          }
        })
        const dedupedData = Object.values(mergedMap)
        
        this.majorStats = dedupedData.map((m, i) => ({
          ...m,
          // 专业名称兜底：majorName > zymc > zydm
          majorName: m.majorName || m.zymc || m.zydm || '未知专业',
          zydm: m.zydm || '',
          color: colors[i % colors.length],
          malePercent: m.studentCount > 0 ? Math.round((m.maleCount / m.studentCount) * 100) : 0,
          femalePercent: m.studentCount > 0 ? Math.round((m.femaleCount / m.studentCount) * 100) : 0,
          avgClassSize: m.classCount > 0 ? Math.round(m.studentCount / m.classCount) : 0,
          classes: []  // 初始化班级列表
        }))
        
        // 计算专业饼图数据
        const totalStudents = this.majorStats.reduce((sum, m) => sum + m.studentCount, 0)
        this.majorPieData = this.majorStats.map((m, i) => ({
          name: m.majorName,
          value: m.studentCount,
          percent: totalStudents > 0 ? Math.round((m.studentCount / totalStudents) * 100) : 0,
          color: colors[i % colors.length]
        }))
        
        // 辅导员统计：后端已过滤 studentCount<=0 并计算好 percent，前端直接渲染
        this.counselorPieData = (counselorRes.data || []).map((c, i) => ({
          name: c.counselorName || c.fdyName || c.fdyname || ('辅导员' + (c.counselorId || '')),
          value: c.studentCount || 0,
          percent: c.percent || 0,
          color: colors[i % colors.length]
        }))
        
        // 加载班级数据并关联到专业
        this.loadClassesAndAttachToMajors()
        
        // 绘制饼图
        this.$nextTick(() => {
          this.drawMajorPieChart()
        })
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    
    // 加载班级数据并关联到专业
    loadClassesAndAttachToMajors() {
      const request = require('@/utils/request')
      request.default({
        url: '/stumanage/classcheck/api/collegeClasses',
        method: 'get',
        params: { xydm: this.secretaryCollege }
      }).then(res => {
        const allClasses = res.data || []
        
        // 按zydm分组班级
        const classesByMajor = {}
        allClasses.forEach(cls => {
          const zydm = cls.zydm || 'unknown'
          if (!classesByMajor[zydm]) {
            classesByMajor[zydm] = []
          }
          classesByMajor[zydm].push(cls)
        })
        
        // 将班级列表附加到对应的专业统计中
        this.majorStats.forEach(major => {
          major.classes = classesByMajor[major.zydm] || []
          // 班级数以实际班级列表为准（统计口径仅含有学生入库的班级，新生班级会偏少）
          if (major.classes.length > 0) {
            major.classCount = major.classes.length
          }
        })
        
        // 检查是否有班级没有对应的专业统计（如26级班级但学生还未入库）
        // 为这些班级创建专业条目，确保所有班级都能显示
        const existingZydms = new Set(this.majorStats.map(m => m.zydm))
        const colors = ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800', '#795548', '#e43d33', '#607d8b', '#8bc34a']
        
        Object.keys(classesByMajor).forEach(zydm => {
          if (!existingZydms.has(zydm) && zydm !== 'unknown') {
            const classes = classesByMajor[zydm]
            // 从班级信息中提取专业名称（尝试从班级名称或第一个班级的zydm推断）
            const firstClass = classes[0]
            const majorName = firstClass.zymc || firstClass.zydm || zydm
            
            // 计算该专业的统计数据
            let studentCount = 0, maleCount = 0, femaleCount = 0
            classes.forEach(cls => {
              studentCount += (cls.bcrs || 0)
              maleCount += (cls.nans || 0)
              femaleCount += (cls.nvsh || 0)
            })
            
            // 创建新的专业条目
            const newMajor = {
              zydm: zydm,
              majorName: majorName,
              studentCount: studentCount,
              classCount: classes.length,
              maleCount: maleCount,
              femaleCount: femaleCount,
              activeCount: studentCount,
              malePercent: studentCount > 0 ? Math.round((maleCount / studentCount) * 100) : 0,
              femalePercent: studentCount > 0 ? Math.round((femaleCount / studentCount) * 100) : 0,
              avgClassSize: classes.length > 0 ? Math.round(studentCount / classes.length) : 0,
              color: colors[this.majorStats.length % colors.length],
              classes: classes
            }
            
            this.majorStats.push(newMajor)
          }
        })
        
        // 计算年级分布统计（用于顶部班级统计格）
        // 只统计在校学生的班级（排除已毕业年级）
        // 考虑学年特点：上半年(1-6月)新生未入学，下半年(7-12月)新生已入学
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1  // 1-12
        
        // 判断是否在上半年（1-6月）
        const isFirstHalf = currentMonth <= 6
        
        // 计算最小年级年份
        // 上半年：新生还没入学，最小年级 = 当前年 - 4（如2026年上半年，最小2022级）
        // 下半年：新生已入学，最小年级 = 当前年 - 3（如2026年下半年，最小2023级）
        const minGradeYear = isFirstHalf ? (currentYear - 4) : (currentYear - 3)
        
        const gradeMap = {}
        allClasses.forEach(cls => {
          const nj = cls.nj || ''
          const grade = nj.substring(0, 4) // 提取前4位，如"2021"
          if (grade) {
            const gradeYear = parseInt(grade)
            // 只统计在校年级（>= minGradeYear）
            if (gradeYear >= minGradeYear) {
              if (!gradeMap[grade]) {
                gradeMap[grade] = { grade: grade + '级', classCount: 0, studentCount: 0 }
              }
              gradeMap[grade].classCount++
              gradeMap[grade].studentCount += (cls.bcrs || 0)
            }
          }
        })
        
        // 转换为数组并排序
        this.gradeClassStats = Object.values(gradeMap).sort((a, b) => b.grade.localeCompare(a.grade))
        
        // 重新计算专业饼图数据（包含新添加的专业）
        const totalStudents = this.majorStats.reduce((sum, m) => sum + m.studentCount, 0)
        const pieColors = ['#2979ff', '#18bc37', '#f3a044', '#9c27b0', '#00bcd4', '#ff9800', '#795548', '#e43d33', '#607d8b', '#8bc34a']
        this.majorPieData = this.majorStats.map((m, i) => ({
          name: m.majorName,
          value: m.studentCount,
          percent: totalStudents > 0 ? Math.round((m.studentCount / totalStudents) * 100) : 0,
          color: pieColors[i % pieColors.length]
        }))
        
        // 重新绘制饼图
        this.$nextTick(() => {
          this.drawMajorPieChart()
        })
      }).catch(err => {
        // 加载失败静默处理
      })
    },
    
    // 绘制专业饼图
    drawMajorPieChart() {
      if (this.majorPieData.length === 0) return
      
      const ctx = uni.createCanvasContext('majorPieChart', this)
      const width = 150
      const height = 100
      const centerX = width / 2
      const centerY = height / 2
      const radius = 35
      
      const total = this.majorPieData.reduce((sum, item) => sum + item.value, 0)
      if (total === 0) return
      
      let startAngle = -Math.PI / 2
      this.majorPieData.forEach((item) => {
        const angle = (item.value / total) * 2 * Math.PI
        const endAngle = startAngle + angle
        
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, endAngle)
        ctx.closePath()
        ctx.setFillStyle(item.color)
        ctx.fill()
        
        startAngle = endAngle
      })
      
      // 绘制中心圆
      ctx.beginPath()
      ctx.arc(centerX, centerY, 18, 0, 2 * Math.PI)
      ctx.setFillStyle('#ffffff')
      ctx.fill()
      
      // 绘制中心文字
      ctx.setFillStyle('#333333')
      ctx.setFontSize(12)
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
      ctx.fillText(total + '人', centerX, centerY)
      
      ctx.draw()
    },
    
    // 显示专业详情
    showMajorDetail(major) {
      uni.showModal({
        title: major.majorName,
        content: `学生总数：${major.studentCount}人\n班级数：${major.classCount}个\n今日请假：${major.onLeaveCount}人`,
        showCancel: false
      })
    },
    
    // 切换专业展开/折叠
    toggleMajorExpand(zydm) {
      this.$set(this.expandedMajors, zydm, !this.expandedMajors[zydm])
    },
    
    // 切换辅导员统计展开/折叠
    toggleCounselorExpand() {
      this.counselorExpanded = !this.counselorExpanded
    },
    
    // 加载班级列表
    loadClasses() {
      getMyClasses().then(res => {
        this.classList = res.data || []
        this.computeTeacherStats()
        this.loadPoliticalStats()
      }).catch(() => {})
    },
    // 从 classList 计算性别和总人数统计
    computeTeacherStats() {
      let total = 0, male = 0, female = 0
      this.classList.forEach(cls => {
        total += (cls.bcrs || 0)
        male += (cls.nans || 0)
        female += (cls.nvsh || 0)
      })
      this.teacherStats.totalStudents = total
      this.teacherStats.maleCount = male
      this.teacherStats.femaleCount = female
    },
    // 加载政治面貌统计（逐班加载学生后汇总）
    loadPoliticalStats() {
      let partyMember = 0, leagueMember = 0, mass = 0
      let loaded = 0
      const total = this.classList.length
      if (total === 0) return
      
      this.classList.forEach(cls => {
        getClassStudents(cls.bjdm).then(res => {
          const students = res.data || []
          students.forEach(stu => {
            const zzmm = stu.zzmm || stu.zzmmName || ''
            if (zzmm.indexOf('党员') >= 0 || zzmm === '1' || zzmm === '2') {
              partyMember++
            } else if (zzmm.indexOf('团员') >= 0 || zzmm === '3') {
              leagueMember++
            } else {
              mass++
            }
          })
          loaded++
          // 每次加载完一个班更新一次
          this.teacherStats.partyMember = partyMember
          this.teacherStats.leagueMember = leagueMember
          this.teacherStats.mass = mass
        }).catch(() => {
          loaded++
        })
      })
    },
    
    // 书记侧边栏：加载专业→班级分层树
    loadSecretaryClassTree() {
      getCollegeClassTreeByRole().then(res => {
        const tree = res.data || []
        const flatClasses = []
        const majorGroups = []
        const expanded = {}
        
        tree.forEach(college => {
          (college.children || []).forEach(major => {
            const classes = (major.children || []).map(cls => ({
              bjdm: cls.bjdm,
              bjjc: cls.bjjc || cls.label,
              bjname: cls.bjname || cls.label,
              bcrs: cls.bcrs || 0,
              nans: cls.nans || 0,
              nvsh: cls.nvsh || 0
            }))
            classes.forEach(c => flatClasses.push(c))
            
            let totalStudents = 0
            classes.forEach(c => { totalStudents += c.bcrs })
            
            majorGroups.push({
              zydm: major.zydm || major.id,
              majorName: major.label || '',
              totalStudents: totalStudents,
              classes: classes
            })
            expanded[major.zydm || major.id] = true
          })
        })
        
        this.secretaryClassTree = majorGroups
        this.classList = flatClasses
        this.secretaryExpandedMajors = expanded
        this.computeTeacherStats()
        this.loadPoliticalStats()
      }).catch(() => {})
    },
    
    // 书记侧边栏：展开/折叠专业
    toggleSecretaryMajor(zydm) {
      this.$set(this.secretaryExpandedMajors, zydm, !this.secretaryExpandedMajors[zydm])
    },
    
    // 搜索输入（防抖）
    onSearchInput() {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => {
        this.handleSearch()
      }, 500)
    },
    
    // 搜索
    handleSearch() {
      const key = this.searchKey.trim()
      if (!key) {
        this.searchResults = []
        return
      }
      
      this.searchResults = []
      
      // 书记视图：全院搜索
      if (this.isSecretaryRole) {
        // 搜索学生（全院范围）
        if (this.searchType === 'all' || this.searchType === 'student') {
          listStuinfo({ pageNum: 1, pageSize: 50, studentName: key }).then(res => {
            const students = res.rows || []
            students.forEach(stu => {
              this.searchResults.push({
                type: 'student',
                id: stu.xh,
                title: stu.studentName,
                desc: `${stu.xh} | ${stu.className} | ${stu.majorName}`,
                data: stu
              })
            })
          }).catch(() => {})
        }
        
        // 搜索学号（全院范围）
        if (this.searchType === 'all' || this.searchType === 'student') {
          listStuinfo({ pageNum: 1, pageSize: 50, xh: key }).then(res => {
            const students = res.rows || []
            students.forEach(stu => {
              // 避免重复添加
              const exists = this.searchResults.find(r => r.type === 'student' && r.id === stu.xh)
              if (!exists) {
                this.searchResults.push({
                  type: 'student',
                  id: stu.xh,
                  title: stu.studentName,
                  desc: `${stu.xh} | ${stu.className} | ${stu.majorName}`,
                  data: stu
                })
              }
            })
          }).catch(() => {})
        }
        
        // 搜索专业（从已加载的专业统计中搜索）
        if (this.searchType === 'all' || this.searchType === 'major') {
          const majorResults = this.majorStats.filter(m => 
            m.majorName && m.majorName.indexOf(key) >= 0
          )
          majorResults.forEach(major => {
            this.searchResults.push({
              type: 'major',
              id: major.zydm,
              title: major.majorName,
              desc: `${major.studentCount}人 | ${major.classCount}个班级`,
              data: major
            })
          })
        }
        
        // 搜索班级（从已加载的专业统计中提取所有班级）
        if (this.searchType === 'all' || this.searchType === 'class') {
          const allClasses = []
          this.majorStats.forEach(major => {
            if (major.classes) {
              allClasses.push(...major.classes)
            }
          })
          const classResults = allClasses.filter(c => 
            (c.bjname && c.bjname.indexOf(key) >= 0) ||
            (c.bjjc && c.bjjc.indexOf(key) >= 0) ||
            (c.bjdm && c.bjdm.indexOf(key) >= 0)
          )
          classResults.forEach(cls => {
            this.searchResults.push({
              type: 'class',
              id: cls.bjdm,
              title: cls.bjname,
              desc: `${cls.bcrs}人 | ${cls.majorName}`,
              data: cls
            })
          })
        }
      } else {
        // 教师视图：原有搜索逻辑
        // 搜索学生
        if (this.searchType === 'all' || this.searchType === 'student') {
          listStuinfo({ pageNum: 1, pageSize: 20, studentName: key }).then(res => {
            const students = res.rows || []
            students.forEach(stu => {
              this.searchResults.push({
                type: 'student',
                id: stu.xh,
                title: stu.studentName,
                desc: `${stu.xh} | ${stu.className} | ${stu.majorName}`,
                data: stu
              })
            })
          }).catch(() => {})
        }
        
        // 搜索专业
        if (this.searchType === 'all' || this.searchType === 'major') {
          const majorResults = this.majorStats.filter(m => 
            m.majorName && m.majorName.indexOf(key) >= 0
          )
          majorResults.forEach(major => {
            this.searchResults.push({
              type: 'major',
              id: major.zydm,
              title: major.majorName,
              desc: `${major.studentCount}人 | ${major.classCount}个班级`,
              data: major
            })
          })
        }
        
        // 搜索班级
        if (this.searchType === 'all' || this.searchType === 'class') {
          getMyClasses().then(res => {
            const classes = res.data || []
            const classResults = classes.filter(c => 
              (c.bjname && c.bjname.indexOf(key) >= 0) ||
              (c.bjjc && c.bjjc.indexOf(key) >= 0)
            )
            classResults.forEach(cls => {
              this.searchResults.push({
                type: 'class',
                id: cls.bjdm,
                title: cls.bjname,
                desc: `${cls.bcrs}人 | ${cls.majorName}`,
                data: cls
              })
            })
          }).catch(() => {})
        }
      }
    },
    // 清空搜索
    handleClear() {
      this.searchKey = ''
      this.searchResults = []
      this.searchType = 'all'
    },
    // 处理搜索结果点击
    handleResultClick(item) {
      if (item.type === 'student') {
        this.showDetail(item.data)
      } else if (item.type === 'major') {
        this.showMajorDetail(item.data)
      } else if (item.type === 'class') {
        this.selectClass(item.data.bjdm)
      }
    },
    loadAllStudents() {
      // 不再预加载所有班级学生，改为按需加载
    },
    toggleSidebar() {
      this.sidebarExpanded = !this.sidebarExpanded
    },
    onScroll(e) {
      this.oldScrollTop = e.detail.scrollTop
    },
    selectClass(bjdm) {
      this.activeBjdm = bjdm
      this.searchKey = ''
      this.searchResults = []
      // 切换时右侧回到顶部
      this.scrollTop = this.oldScrollTop
      this.$nextTick(() => { this.scrollTop = 0 })
      if (bjdm) {
        if (!this.isSecretarySidebar) {
          this.sidebarExpanded = false
        }
        this.loadClassDetail(bjdm)
      }
    },
    loadClassDetail(bjdm) {
      getClassStudents(bjdm).then(res => {
        this.studentList = res.data || []
      }).catch(() => { this.studentList = [] })
      const today = this.getTodayStr()
      listLeave({ pageNum: 1, pageSize: 999, bjdm: bjdm, approvalStatus: 'approved' }).then(res => {
        this.classLeaves = (res.rows || []).filter(l => {
          if (!l.startTime || !l.endTime) return false
          return today >= this.fmtDate(l.startTime) && today <= this.fmtDate(l.endTime)
        })
        this.classLeaveCount = this.classLeaves.length
      }).catch(() => { this.classLeaves = []; this.classLeaveCount = 0 })
    },
    showDetail(stu, mode = 'overview') {
      this.detailStu = { ...stu }
      this.detailMode = mode
      this.portrait = null
      this.portraitError = ''
      this.portraitLoading = false
      this.detailVisible = true
      this.loadStudentPortrait(stu.xh)
    },
    switchDetailMode(mode) {
      this.detailMode = mode
      if (mode === 'portrait' && !this.portrait && !this.portraitLoading) {
        this.loadStudentPortrait(this.detailStu && this.detailStu.xh)
      }
    },
    loadStudentPortrait(xh, force = false) {
      if (!xh) return
      if (!force && this.portrait && this.portrait.xh === xh) return
      const requestXh = xh
      this.portraitLoading = true
      this.portraitError = ''
      getStudentPortrait(requestXh).then(res => {
        if (!this.detailStu || this.detailStu.xh !== requestXh) return
        this.portrait = res.data || null
      }).catch(err => {
        if (!this.detailStu || this.detailStu.xh !== requestXh) return
        this.portrait = null
        this.portraitError = (err && (err.msg || err.message)) || '画像加载失败'
      }).finally(() => {
        if (!this.detailStu || this.detailStu.xh === requestXh) {
          this.portraitLoading = false
        }
      })
    },
    stuPhotoUrl(photo) {
      if (!photo) return ''
      if (photo.startsWith('http')) return photo
      const base = require('@/config.js').baseUrl
      return base + photo
    },
    // 图片加载失败时降级为文字头像
    onPhotoError() {
      if (this.detailStu) {
        this.$set(this.detailStu, '_photoErr', true)
      }
    },
    closeDetail() {
      this.detailVisible = false
    },
    formatStatValue(value, unit) {
      return value == null ? '—' : value + unit
    },
    toScore(value) {
      if (value == null || value === '') return null
      const score = Number(value)
      return Number.isFinite(score) ? score : null
    },
    scoreTone(value) {
      if (value == null) return 'neutral'
      if (Number(value) < 60) return 'danger'
      if (Number(value) < 80) return 'warning'
      return 'good'
    },
    formatMetricValue(metric) {
      if (!metric || metric.computable === false) return '未接入'
      if (metric.value == null) return '无记录'
      if (metric.metricUnit === 'RATIO') return (Number(metric.value) * 100).toFixed(1) + '%'
      if (metric.metricUnit === 'TIMES') return Number(metric.value).toFixed(0) + ' 次'
      return String(metric.value)
    },
    formatMetricWindow(metric) {
      if (!metric) return ''
      if (metric.statWindow === 'LAST_DAYS') return `近 ${metric.windowDays || 0} 天`
      if (metric.statWindow === 'SEMESTER') return '本学期'
      if (metric.statWindow === 'TERM') return '本学段'
      return metric.statWindow || '统计窗口未配置'
    },
    tagTone(category) {
      return {
        RISK: 'risk',
        ACADEMIC: 'academic',
        ECONOMIC: 'economic',
        DISCIPLINE: 'discipline',
        EMPLOY: 'employ',
        HONOR: 'honor'
      }[category] || 'other'
    },
    warningTone(level) {
      if (level === 'red') return 'red'
      if (level === 'orange') return 'orange'
      if (level === 'yellow') return 'yellow'
      return 'default'
    },
    warningLevelText(level) {
      return { red: '红色预警', orange: '橙色预警', yellow: '黄色预警' }[level] || '一般预警'
    },
    warningTypeText(type) {
      return {
        attendance: '出勤',
        academic: '学业',
        discipline: '纪律',
        behavior: '行为',
        night: '晚归'
      }[type] || type || '综合'
    },
    handleSearch() {
      const key = this.searchKey.trim()
      if (!key) {
        this.searchResults = []
        return
      }
      if (this.activeBjdm === '') {
        // 总览模式：逐班搜索，找到即停
        let all = []
        for (let i = 0; i < this.classList.length; i++) {
          const cls = this.classList[i]
          if (!cls._students) {
            try {
              // 同步不可行，改为异步逐班加载
              break
            } catch (e) { break }
          }
          if (cls._students) {
            cls._students.forEach(s => {
              if ((s.studentName && s.studentName.indexOf(key) >= 0) || (s.xh && s.xh.indexOf(key) >= 0)) {
                all.push(s)
              }
            })
          }
        }
        this.searchResults = all
        // 异步加载未缓存的班级并搜索
        this.searchAllClasses(key)
      }
      // 单班级模式使用 filteredStudents 计算属性
    },
    searchAllClasses(key) {
      const uncached = this.classList.filter(cls => !cls._students)
      if (uncached.length === 0) {
        // 全部已缓存，合并结果
        let all = []
        this.classList.forEach(cls => {
          if (cls._students) {
            cls._students.forEach(s => {
              if ((s.studentName && s.studentName.indexOf(key) >= 0) || (s.xh && s.xh.indexOf(key) >= 0)) {
                all.push(s)
              }
            })
          }
        })
        this.searchResults = all
        return
      }
      // 逐个加载未缓存班级
      let loaded = 0
      uncached.forEach(cls => {
        getClassStudents(cls.bjdm).then(res => {
          this.$set(cls, '_students', res.data || [])
          // 每加载完一个班就更新搜索结果
          let all = []
          this.classList.forEach(c => {
            if (c._students) {
              c._students.forEach(s => {
                if ((s.studentName && s.studentName.indexOf(key) >= 0) || (s.xh && s.xh.indexOf(key) >= 0)) {
                  all.push(s)
                }
              })
            }
          })
          this.searchResults = all
        }).catch(() => { this.$set(cls, '_students', []) })
      })
    },
    isOnLeave(xh) {
      return this.classLeaves.some(l => l.xh === xh)
    },
    formatLeaveType(val) {
      const map = { sick: '病假', personal: '事假', other: '其他' }
      return map[val] || val || '请假'
    },
    getTodayStr() {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    fmtDate(val) {
      if (!val) return ''
      const d = new Date(val.replace(/ /g, 'T'))
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    },
    // 获取班级颜色
    getClassColor(cls) {
      const idx = this.classList.findIndex(c => c.bjdm === cls.bjdm)
      return idx >= 0 ? this.classColors[idx % this.classColors.length] : '#2979ff'
    },
    
    // 计算专业柱状图宽度百分比
    getMajorBarWidth(studentCount) {
      if (this.majorStats.length === 0) return 0
      const maxCount = Math.max(...this.majorStats.map(m => m.studentCount))
      if (maxCount === 0) return 0
      return Math.round((studentCount / maxCount) * 100)
    }
  }
}
</script>

<style lang="scss" scoped>
.page-container {
  display: flex;
  height: 100vh;
  background: #f5f6f7;
}

/* ===== 左侧窄条 ===== */
.sidebar {
  background: #fff;
  border-right: 1rpx solid #eee;
  flex-shrink: 0;
  transition: width 0.25s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.expanded {
  width: 140rpx;
}

.sidebar.collapsed {
  width: 14rpx;
}

.side-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  border-bottom: 1rpx solid #eee;
}

.side-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 4rpx 12rpx;
  border-bottom: 1rpx solid #f5f5f5;
  position: relative;
}

.side-item.active {
}

/* 左侧竖条指示器 - 收缩时作为色块，展开时作为左侧条 */
.side-bar {
  position: absolute;
  left: 0;
  top: 4rpx;
  bottom: 4rpx;
  width: 4rpx;
  border-radius: 0 3rpx 3rpx 0;
  opacity: 0.35;
  transition: all 0.2s;
}

.sidebar.collapsed .side-bar {
  width: 14rpx;
  top: 0;
  bottom: 0;
  border-radius: 0;
  opacity: 1;
}

.side-bar.bar-all {
  background: #666;
}

.side-bar.bar-active {
  width: 8rpx;
  opacity: 1;
}

.sidebar.collapsed .side-bar.bar-active {
  width: 14rpx;
}

.side-text {
  font-size: 20rpx;
  color: #333;
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.side-sub {
  font-size: 16rpx;
  color: #999;
  margin-top: 4rpx;
}

/* ===== 右侧主区域 ===== */
.main-area {
  flex: 1;
  padding: 16rpx 20rpx;
}

/* ===== 搜索框 ===== */
.search-bar {
  margin-bottom: 16rpx;
}

/* ===== 通用卡片 ===== */
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

/* ===== 搜索结果学生行 ===== */
.stu-row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  gap: 12rpx;
}

.student-list-card {
  padding: 20rpx;
}

.student-list-card .stu-row {
  flex-direction: column;
  align-items: stretch;
  gap: 10rpx;
  padding: 20rpx 8rpx;
}

.stu-row-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10rpx;
}

.stu-row-meta {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 20rpx;
  padding-left: 52rpx;
  color: #94a3b8;
  font-size: 21rpx;
}

.stu-row:last-child {
  border-bottom: none;
}

.stu-idx {
  font-size: 22rpx;
  color: #ccc;
  width: 40rpx;
  text-align: center;
  flex-shrink: 0;
}

.stu-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  width: 100rpx;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stu-row-main .stu-name {
  width: 110rpx;
}

.stu-name.link {
  color: #2979ff;
}

.stu-sex {
  font-size: 22rpx;
  flex-shrink: 0;
  width: 28rpx;
  text-align: center;
  &.male { color: #2979ff; }
  &.female { color: #e43d33; }
  &.unknown { color: #999; }
}

.stu-xh {
  font-size: 20rpx;
  color: #64748b;
  width: auto;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stu-zzmm {
  font-size: 20rpx;
  color: #666;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
  padding-right: 8rpx;
}

.stu-row-main .stu-zzmm {
  min-width: 72rpx;
  padding-right: 0;
}

.stu-cls {
  font-size: 20rpx;
  color: #999;
  flex-shrink: 0;
}

.stu-phone {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6rpx;
  min-width: 230rpx;
  margin-left: auto;
  color: #475569;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stu-phone-label {
  color: #94a3b8;
  font-size: 19rpx;
}

.stu-status {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  &.on-campus { color: #18bc37; background: #e8f8ea; }
  &.on-leave { color: #f3a044; background: #fef3e2; }
}

.stu-portrait-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 68rpx;
  min-height: 40rpx;
  box-sizing: border-box;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: #eff6ff;
  color: #2563eb;
  font-size: 19rpx;
  line-height: 1;
  flex-shrink: 0;
  white-space: nowrap;
}

/* ===== 班级头部 ===== */
.class-head {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
}

.ch-row1 {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.ch-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.ch-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.ch-row2 {
  padding-left: 24rpx;
}

.ch-gender {
  font-size: 22rpx;
  color: #666;
}

/* ===== 请假明细 ===== */
.leave-row {
  display: flex;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  gap: 12rpx;
}

.leave-row:last-child {
  border-bottom: none;
}

.lr-name {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
  flex: 1;
}

.lr-type {
  font-size: 20rpx;
  color: #f3a044;
  background: #fef3e2;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.lr-days {
  font-size: 20rpx;
  color: #999;
}

.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 24rpx;
}

/* ===== 学生详情弹窗 ===== */
.student-detail-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(15, 23, 42, 0.48);
}

.detail-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 88vh;
  overflow: hidden;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -10rpx 40rpx rgba(15, 23, 42, 0.16);
  animation: detail-panel-in 0.2s ease-out;
}

.detail-panel-scroll {
  flex: 1;
  min-height: 0;
  max-height: calc(88vh - 112rpx);
}

@keyframes detail-panel-in {
  from {
    transform: translateY(40rpx);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dp-header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.dp-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin: -12rpx -12rpx -12rpx 0;
  border-radius: 50%;
  background: #f8fafc;
}

.dp-title-wrap {
  display: flex;
  flex-direction: column;
}

.dp-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.dp-title-sub {
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #94a3b8;
}

.dp-body {
  padding: 24rpx 32rpx 40rpx;
}

.dp-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 28rpx;
}

.dp-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dp-photo {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #f0f0f0;
}

.dp-avatar.avatar-male {
  background: #e8f0fe;
}

.dp-avatar.avatar-female {
  background: #fce8ec;
}

.dp-avatar.avatar-unknown {
  background: #f0f0f0;
}

.dp-avatar-text {
  font-size: 36rpx;
  font-weight: bold;
}

.avatar-male .dp-avatar-text {
  color: #2979ff;
}

.avatar-female .dp-avatar-text {
  color: #e43d33;
}

.dp-top-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4rpx;
}

.dp-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.dp-sub {
  font-size: 24rpx;
  color: #999;
}

.dp-top-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 16rpx;
  margin-top: 6rpx;
}

.dp-top-meta-item {
  max-width: 100%;
  overflow: hidden;
  color: #64748b;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-grid {
  display: flex;
  flex-wrap: wrap;
}

.dp-cell {
  width: 50%;
  padding: 14rpx 0;
  box-sizing: border-box;
}

.dp-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.dp-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  display: block;
  word-break: break-all;
}

.dp-switch {
  display: flex;
  padding: 6rpx;
  margin-bottom: 28rpx;
  background: #f1f5f9;
  border-radius: 16rpx;
}

.dp-switch-item {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #64748b;
  transition: all 0.2s ease;
}

.dp-switch-item.active {
  background: #fff;
  color: #1d4ed8;
  font-weight: bold;
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.08);
}

.dp-switch-badge {
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 7rpx;
  margin-left: 8rpx;
  box-sizing: border-box;
  border-radius: 14rpx;
  background: #ef4444;
  color: #fff;
  font-size: 18rpx;
  line-height: 28rpx;
  text-align: center;
}

.dp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 30rpx 0 16rpx;
}

.dp-section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1e293b;
}

.dp-section-meta {
  font-size: 21rpx;
  color: #94a3b8;
}

.dp-inline-error {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 18rpx;
  margin-bottom: 14rpx;
  border-radius: 12rpx;
  background: #fffbeb;
  color: #b45309;
  font-size: 22rpx;
}

.dp-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
}

.dp-stat-item {
  min-width: 0;
  padding: 18rpx 10rpx;
  border: 1rpx solid #e8eef5;
  border-radius: 14rpx;
  background: #f8fafc;
  text-align: center;
}

.dp-stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #0f172a;
  white-space: nowrap;
}

.dp-stat-label {
  display: block;
  margin-top: 5rpx;
  font-size: 21rpx;
  color: #64748b;
}

.dp-stat-value.good {
  color: #15803d;
}

.dp-stat-value.warning,
.dp-score-value.warning {
  color: #b45309;
}

.dp-stat-value.danger,
.dp-score-value.danger,
.dp-profile-num.danger {
  color: #dc2626;
}

.dp-stat-value.neutral,
.dp-score-value.neutral {
  color: #94a3b8;
}

.dp-score-value.good {
  color: #15803d;
}

.dp-metric-list,
.dp-score-list,
.dp-warning-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.dp-metric-item {
  padding: 18rpx;
  border: 1rpx solid #e8eef5;
  border-radius: 14rpx;
  background: #fff;
}

.dp-metric-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.dp-metric-name {
  min-width: 0;
  font-size: 25rpx;
  font-weight: 600;
  color: #334155;
}

.dp-metric-value {
  flex-shrink: 0;
  font-size: 27rpx;
  font-weight: bold;
  color: #0f766e;
}

.dp-metric-value.muted {
  color: #94a3b8;
}

.dp-metric-foot {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #64748b;
}

.dp-metric-detail {
  flex: 1;
  min-width: 0;
  color: #94a3b8;
  word-break: break-all;
}

.dp-empty-line {
  padding: 24rpx;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 23rpx;
  text-align: center;
}

.dp-profile-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  padding: 22rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #eff6ff, #f0fdfa);
}

.dp-profile-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.dp-context-item {
  min-width: 0;
  padding: 16rpx 18rpx;
  border: 1rpx solid #e8eef5;
  border-radius: 14rpx;
  background: #f8fafc;
}

.dp-context-label {
  display: block;
  margin-bottom: 6rpx;
  color: #94a3b8;
  font-size: 20rpx;
}

.dp-context-value {
  display: block;
  overflow: hidden;
  color: #334155;
  font-size: 24rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp-profile-stat {
  text-align: center;
}

.dp-profile-num {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: #0f172a;
}

.dp-profile-label {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #64748b;
}

.dp-score-item {
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: #f8fafc;
}

.dp-score-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24rpx;
}

.dp-score-name {
  color: #334155;
  font-weight: 600;
}

.dp-score-value {
  color: #64748b;
}

.dp-score-track {
  height: 10rpx;
  margin-top: 12rpx;
  overflow: hidden;
  border-radius: 5rpx;
  background: #e2e8f0;
}

.dp-score-bar {
  height: 100%;
  border-radius: 5rpx;
  background: #64748b;
  transition: width 0.35s ease;
}

.dp-score-bar.good {
  background: #10b981;
}

.dp-score-bar.warning {
  background: #f59e0b;
}

.dp-score-bar.danger {
  background: #ef4444;
}

.dp-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.dp-tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  color: #475569;
  font-size: 22rpx;
}

.dp-tag.risk,
.dp-tag.discipline {
  background: #fef2f2;
  color: #b91c1c;
}

.dp-tag.academic,
.dp-tag.economic {
  background: #fffbeb;
  color: #b45309;
}

.dp-tag.employ,
.dp-tag.honor {
  background: #ecfdf5;
  color: #047857;
}

.dp-warning-item {
  padding: 18rpx;
  border: 1rpx solid #fee2e2;
  border-radius: 14rpx;
  background: #fffafa;
}

.dp-warning-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10rpx;
}

.dp-warning-level {
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20rpx;
  font-weight: 600;
}

.dp-warning-level.red {
  background: #fee2e2;
  color: #b91c1c;
}

.dp-warning-level.orange {
  background: #ffedd5;
  color: #c2410c;
}

.dp-warning-level.yellow {
  background: #fef9c3;
  color: #a16207;
}

.dp-warning-type {
  font-size: 22rpx;
  color: #475569;
}

.dp-warning-date {
  margin-left: auto;
  font-size: 20rpx;
  color: #94a3b8;
}

.dp-warning-text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.55;
  color: #334155;
}

.dp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 54rpx 20rpx;
  color: #94a3b8;
  font-size: 24rpx;
}

.dp-state-error {
  color: #b45309;
}

.dp-retry {
  color: #2563eb;
}

.dp-overview .dp-section-head:first-child,
.dp-portrait .dp-section-head:first-child {
  margin-top: 4rpx;
}

/* ===== 书记角色：专业统计视图 ===== */
.search-section {
  padding: 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.filter-chip {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
  &.active {
    background: #2979ff;
    color: #fff;
  }
}

/* 汇总卡片 */
.summary-cards {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  margin-bottom: 20rpx;
}

.summary-item {
  flex: 1;
  background: linear-gradient(135deg, #f5f7fa, #e8ecf1);
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-num {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  &.blue { color: #2979ff; }
  &.orange { color: #f3a044; }
  &.red { color: #e43d33; }
}

.summary-label {
  font-size: 22rpx;
  color: #666;
  margin-top: 8rpx;
}

/* 专业统计 */
.major-section {
  padding: 0 20rpx 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.section-count {
  font-size: 24rpx;
  color: #999;
}

.major-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.major-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.major-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.major-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.major-code {
  font-size: 22rpx;
  color: #999;
}

.major-stats {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  &.orange { color: #f3a044; }
}

.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 班级分布 */
.class-distribution {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  align-items: center;
}

.class-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.class-tag-text {
  font-size: 24rpx;
  color: #333;
}

.class-tag-count {
  font-size: 22rpx;
  color: #999;
}

.more-classes-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  margin-top: 12rpx;
  background: #f0f7ff;
  border-radius: 12rpx;
  
  &:active {
    background: #e0f0ff;
  }
  
  .more-classes-text {
    font-size: 24rpx;
    color: #2979ff;
    font-weight: 500;
  }
}

.more-classes {
  font-size: 22rpx;
  color: #2979ff;
}

/* 搜索结果 */
.search-results {
  padding: 0 20rpx 20rpx;
}

.result-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.result-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  color: #fff;
  &.badge-student { background: #2979ff; }
  &.badge-major { background: #f3a044; }
  &.badge-class { background: #18bc37; }
}

.result-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.result-desc {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}

/* ===== 书记角色：专业统计视图 ===== */

/* 滚动容器 */
.secretary-scroll-view {
  flex: 1;
  height: 100vh;
  background: #f5f6f7;
}

/* 汇总卡片 */
.summary-cards {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
}

.summary-card-item {
  flex: 1;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

/* 主卡片（总人数+男女） */
.summary-card-main {
  flex: 1.5;
}

.card-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.card-label-top {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.card-num-big {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.card-row-sub {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.sub-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.sub-num {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.sub-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
}

.sub-divider {
  width: 1rpx;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.3);
}

.empty-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  width: 100%;
}

.card-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  line-height: 1.2;
}

.card-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4rpx;
  display: block;
}

/* 搜索栏 */
.search-section {
  padding: 0 20rpx 20rpx;
}

.filter-bar {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.filter-chip {
  padding: 8rpx 20rpx;
  background: #f5f7fa;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #666;
  transition: all 0.2s;
}

.filter-chip.active {
  background: #2979ff;
  color: #fff;
}

/* 专业统计列表 */
.major-section {
  padding: 0 20rpx 20rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.section-count {
  font-size: 24rpx;
  color: #999;
}

.major-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

.major-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.major-info {
  flex: 1;
}

.major-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.major-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.major-class-count {
  font-size: 22rpx;
  color: #2979ff;
  background: #e8f0fe;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.major-code {
  font-size: 22rpx;
  color: #999;
}

.major-total {
  text-align: right;
}

.total-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #2979ff;
  line-height: 1;
}

.total-label {
  font-size: 22rpx;
  color: #999;
  margin-left: 4rpx;
}

/* 性别统计 */
.gender-stats {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.gender-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.gender-item.male {
  color: #2979ff;
}

.gender-item.female {
  color: #e43d33;
}

.gender-icon {
  font-size: 28rpx;
}

.gender-num {
  font-size: 32rpx;
  font-weight: bold;
}

.gender-label {
  font-size: 22rpx;
}

.gender-percent {
  font-size: 20rpx;
  opacity: 0.7;
}

.gender-divider {
  width: 1rpx;
  height: 40rpx;
  background: #e0e0e0;
}

/* 班级统计 */
.class-stats {
  display: flex;
  justify-content: space-around;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.class-stat-item {
  text-align: center;
}

.class-stat-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.class-stat-label {
  font-size: 20rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}

/* 年级分布 */
.grade-distribution {
  margin-bottom: 16rpx;
}

.grade-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}

.grade-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.grade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  background: #f9fafb;
  border-radius: 8rpx;
}

.grade-name {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  flex-shrink: 0;
}

.grade-classes,
.grade-students {
  font-size: 22rpx;
  color: #666;
}

/* 班级列表预览 */
.class-list-preview {
  margin-top: 16rpx;
}

.class-list-title {
  font-size: 24rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.class-item:last-child {
  border-bottom: none;
}

.class-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.class-name {
  flex: 1;
  font-size: 24rpx;
  color: #333;
}

.class-count {
  font-size: 22rpx;
  color: #666;
  flex-shrink: 0;
}

.class-gender {
  font-size: 20rpx;
  color: #999;
  flex-shrink: 0;
}

.major-arrow {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
}

/* 饼图统计区域 */
.charts-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
  background: #f5f7fa;
}

.chart-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.chart-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.chart-subtitle {
  font-size: 22rpx;
  color: #999;
}

/* 专业横向柱状图 */
.major-bar-chart {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.major-bar-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.major-bar-info {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.major-bar-name {
  flex: 1;
  font-size: 24rpx;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.major-bar-class-count {
  font-size: 20rpx;
  color: #2979ff;
  background: #e8f0fe;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.gender-male {
  color: #2979ff;
  font-weight: 500;
  font-size: 20rpx;
  flex-shrink: 0;
}

.gender-female {
  color: #e43d33;
  font-weight: 500;
  font-size: 20rpx;
  flex-shrink: 0;
}

.major-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.major-bar-bg {
  flex: 1;
  height: 28rpx;
  background: #f5f5f5;
  border-radius: 14rpx;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: row;
}

.major-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  min-width: 2rpx;
  border-radius: 14rpx;
}

.major-bar-fill.male {
  background: linear-gradient(135deg, #2979ff, #448aff);
  border-radius: 14rpx 0 0 14rpx;
}

.major-bar-fill.female {
  background: linear-gradient(135deg, #e43d33, #ff5252);
  border-radius: 0 14rpx 14rpx 0;
}

.major-bar-value {
  font-size: 22rpx;
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
  min-width: 70rpx;
  text-align: right;
}



.chart-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.pie-canvas {
  width: 300rpx;
  height: 200rpx;
  flex-shrink: 0;
}

.rose-canvas {
  width: 300rpx;
  height: 300rpx;
  flex-shrink: 0;
}

.chart-legend-scroll {
  flex: 1;
  max-height: 400rpx;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-value {
  font-size: 22rpx;
  color: #666;
  flex-shrink: 0;
}

/* 辅导员横向条形图 */
.counselor-bar-list {
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.counselor-bar-item {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.counselor-bar-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.counselor-bar-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.counselor-bar-name {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.counselor-bar-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.counselor-bar-track {
  flex: 1;
  height: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  overflow: hidden;
}

.counselor-bar-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.3s ease;
  min-width: 4rpx;
}

.counselor-bar-value {
  font-size: 24rpx;
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
  min-width: 80rpx;
  text-align: right;
}

.counselor-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx 0 8rpx;
  margin-top: 8rpx;
  border-top: 1rpx solid #f0f0f0;
}

.counselor-expand-text {
  font-size: 26rpx;
  color: #2979ff;
  font-weight: 500;
}

// 全部班级弹窗样式
.all-classes-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
      flex: 1;
    }
    
    .popup-close {
      width: 48rpx;
      height: 48rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .popup-content {
    flex: 1;
    overflow-y: auto;
    padding: 16rpx 0;
    max-height: calc(70vh - 120rpx);
  }
  
  .popup-class-item {
    display: flex;
    align-items: center;
    padding: 24rpx 32rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:active {
      background: #f9f9f9;
    }
    
    .popup-class-dot {
      width: 12rpx;
      height: 32rpx;
      border-radius: 6rpx;
      margin-right: 20rpx;
    }
    
    .popup-class-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .popup-class-name {
        font-size: 28rpx;
        color: #333;
        font-weight: 500;
      }
      
      .popup-class-detail {
        font-size: 24rpx;
        color: #999;
      }
    }
  }
  
  .popup-empty {
    padding: 80rpx 0;
    text-align: center;
    font-size: 28rpx;
    color: #999;
  }
}

/* ===== 教师统计汇总模块 ===== */
.teacher-stats-section {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.teacher-stats-card {
  flex: 1;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.tsc-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.tsc-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.tsc-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

.tsc-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.tsc-sub {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
}

.tsc-sub-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.tsc-sub-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #fff;
  line-height: 1.2;
}

.tsc-sub-label {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.8);
}

.tsc-sub-divider {
  width: 1rpx;
  height: 36rpx;
  background: rgba(255, 255, 255, 0.3);
}

/* 班级汇总列表 */
.class-summary-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f8f8f8;
  gap: 16rpx;
}

.class-summary-item:last-child {
  border-bottom: none;
}

.csi-bar {
  width: 8rpx;
  height: 44rpx;
  border-radius: 4rpx;
  flex-shrink: 0;
}

.csi-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.csi-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.csi-detail {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.csi-gender {
  font-size: 22rpx;
  color: #999;
}

.csi-total {
  font-size: 22rpx;
  color: #666;
}

/* ===== 书记分层侧边栏 ===== */
.secretary-sidebar {
  width: 280rpx;
  background: #f7f8fa;
  border-right: 1rpx solid #ebedf0;
  height: 100%;
  flex-shrink: 0;
}

.sidebar-scroll {
  height: 100%;
}

.tree-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #ebedf0;
  
  &.active {
    background: #e8f4ff;
    border-left: 4rpx solid #2979ff;
  }
}

.tree-overview-text {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
}

.tree-overview-count {
  font-size: 22rpx;
  color: #999;
}

.major-group {
  border-bottom: 1rpx solid #ebedf0;
}

.major-header-tree {
  display: flex;
  align-items: center;
  padding: 18rpx 16rpx;
  background: #f0f2f5;
  
  &:active {
    background: #e4e6e9;
  }
}

.major-expand-icon {
  font-size: 18rpx;
  color: #999;
  width: 28rpx;
  text-align: center;
  flex-shrink: 0;
}

.major-tree-name {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.major-tree-count {
  font-size: 20rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: 8rpx;
}

.class-tree-list {
  background: #fff;
}

.class-tree-item {
  display: flex;
  align-items: center;
  padding: 16rpx 16rpx 16rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
  
  &.active {
    background: #e8f4ff;
    border-left: 4rpx solid #2979ff;
    padding-left: 28rpx;
  }
  
  &:active {
    background: #f0f0f0;
  }
}

.class-tree-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.class-tree-name {
  font-size: 24rpx;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-tree-count {
  font-size: 20rpx;
  color: #999;
  flex-shrink: 0;
  margin-left: 8rpx;
}
</style>
