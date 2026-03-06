import { mutation } from "./_generated/server";

/**
 * Seed 数据：用于 Demo 演示，在 Convex Dashboard 手动调用一次即可
 * 创建示例用户、技能、交换会话，方便前端开发和演示
 */
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      return { message: "已有数据，跳过 seed" };
    }

    // 创建示例用户
    const jessica = await ctx.db.insert("users", {
      clerkId: "demo_jessica",
      name: "Jessica Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
      title: "Full-Stack Developer",
      location: "上海",
      bio: "热爱编程和音乐，擅长 React 和 Python",
      level: "advanced",
      trustScore: 92,
      credits: 350,
      isPro: true,
      speaks: ["中文", "English"],
      tags: ["React", "Python", "Music"],
      skillTags: ["React", "Python", "吉他"],
      skillRatings: [
        { skillTag: "React", mu: 35.2, sigma: 4.1 },
        { skillTag: "Python", mu: 30.5, sigma: 5.0 },
        { skillTag: "吉他", mu: 20.0, sigma: 7.5 },
      ],
      nftSkills: [
        {
          tokenId: "nft_jessica_react_001",
          skillTag: "React",
          swapCount: 12,
          metadataUri: "https://demo.skillswap.app/nft/jessica-react",
        },
      ],
      onboardingCompleted: true,
    });

    const alex = await ctx.db.insert("users", {
      clerkId: "demo_alex",
      name: "Alex Wang",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      title: "Music Teacher & Designer",
      location: "北京",
      bio: "专业吉他教师，同时学习 UI 设计",
      level: "intermediate",
      trustScore: 85,
      credits: 200,
      isPro: false,
      speaks: ["中文", "日本語"],
      tags: ["Guitar", "Design", "Music Theory"],
      skillTags: ["吉他", "UI设计", "音乐理论"],
      skillRatings: [
        { skillTag: "吉他", mu: 38.0, sigma: 3.2 },
        { skillTag: "UI设计", mu: 22.0, sigma: 6.5 },
        { skillTag: "音乐理论", mu: 32.0, sigma: 4.8 },
      ],
      nftSkills: [
        {
          tokenId: "nft_alex_guitar_001",
          skillTag: "吉他",
          swapCount: 8,
          metadataUri: "https://demo.skillswap.app/nft/alex-guitar",
        },
      ],
      onboardingCompleted: true,
    });

    const maria = await ctx.db.insert("users", {
      clerkId: "demo_maria",
      name: "Maria Garcia",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      title: "Data Scientist",
      location: "深圳",
      bio: "数据科学爱好者，正在学习中文",
      level: "intermediate",
      trustScore: 78,
      credits: 150,
      isPro: false,
      speaks: ["English", "Español"],
      tags: ["Python", "Data Science", "Spanish"],
      skillTags: ["Python", "数据分析", "西班牙语"],
      skillRatings: [
        { skillTag: "Python", mu: 33.0, sigma: 4.5 },
        { skillTag: "数据分析", mu: 28.0, sigma: 5.5 },
        { skillTag: "西班牙语", mu: 36.0, sigma: 3.8 },
      ],
      nftSkills: [
        {
          tokenId: "nft_maria_python_001",
          skillTag: "Python",
          swapCount: 5,
          metadataUri: "https://demo.skillswap.app/nft/maria-python",
        },
      ],
      onboardingCompleted: true,
    });

    // 创建示例技能
    const skills = [
      {
        userId: jessica,
        skillTag: "React",
        title: "React 前端开发实战",
        description: "从零到一构建现代 React 应用，包含 Hooks、状态管理、性能优化",
        category: "编程",
        level: "advanced" as const,
        type: "teaching" as const,
        rating: 4.8,
        lessons: 24,
        isAvailable: true,
        price: "30 credits/hr",
      },
      {
        userId: jessica,
        skillTag: "Python",
        title: "Python 入门到进阶",
        description: "Python 基础语法、数据结构、面向对象编程",
        category: "编程",
        level: "intermediate" as const,
        type: "teaching" as const,
        rating: 4.6,
        lessons: 18,
        isAvailable: true,
        price: "25 credits/hr",
      },
      {
        userId: alex,
        skillTag: "吉他",
        title: "吉他零基础教学",
        description: "民谣吉他入门，包含和弦、指法、弹唱技巧",
        category: "音乐",
        level: "beginner" as const,
        type: "teaching" as const,
        rating: 4.9,
        lessons: 30,
        isAvailable: true,
        price: "20 credits/hr",
      },
      {
        userId: maria,
        skillTag: "Python",
        title: "Python 数据科学",
        description: "Pandas、NumPy、数据可视化、机器学习入门",
        category: "编程",
        level: "intermediate" as const,
        type: "teaching" as const,
        rating: 4.5,
        lessons: 15,
        isAvailable: true,
        price: "28 credits/hr",
      },
      {
        userId: maria,
        skillTag: "西班牙语",
        title: "西班牙语日常会话",
        description: "从基础发音到日常对话，适合初学者",
        category: "语言",
        level: "beginner" as const,
        type: "teaching" as const,
        rating: 4.7,
        lessons: 20,
        isAvailable: true,
        price: "22 credits/hr",
      },
    ];

    for (const skill of skills) {
      await ctx.db.insert("skills", skill);
    }

    // 创建示例交换会话
    await ctx.db.insert("sessions", {
      requesterId: jessica,
      providerId: alex,
      title: "吉他入门课",
      type: "learning",
      status: "upcoming",
      date: "2026-03-10",
      time: "14:00",
      roomLink: "https://meet.skillswap.app/room-001",
      rated: false,
    });

    await ctx.db.insert("sessions", {
      requesterId: maria,
      providerId: jessica,
      title: "React 基础",
      type: "learning",
      status: "completed",
      date: "2026-03-01",
      time: "10:00",
      rated: true,
      requesterScore: 5,
      providerScore: 4,
    });

    // 创建联系人关系
    await ctx.db.insert("contacts", {
      userId: jessica,
      contactUserId: alex,
      name: "Alex Wang",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      lastMsg: "明天下午 2 点见！",
      lastMsgTime: Date.now(),
      unread: 0,
      status: "online",
      skill: "吉他",
    });

    await ctx.db.insert("contacts", {
      userId: alex,
      contactUserId: jessica,
      name: "Jessica Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
      lastMsg: "明天下午 2 点见！",
      lastMsgTime: Date.now(),
      unread: 1,
      status: "online",
      skill: "React",
    });

    // 创建示例帖子
    await ctx.db.insert("posts", {
      userId: jessica,
      authorName: "Jessica Chen",
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
      content: "刚完成了一次很棒的 React 教学交换！对方学得很快，我也从中收获了很多教学经验。SkillSwap 让知识分享变得如此简单！",
      likes: 15,
      comments: 3,
      tags: ["React", "教学"],
      type: "experience",
    });

    await ctx.db.insert("posts", {
      userId: alex,
      authorName: "Alex Wang",
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      content: "有人想一起学习 UI 设计吗？我可以用吉他教学来交换！",
      likes: 8,
      comments: 5,
      tags: ["UI设计", "吉他", "求交换"],
      type: "request",
    });

    // 创建社区动态
    await ctx.db.insert("communityUpdates", {
      userId: jessica,
      userName: "Jessica Chen",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jessica",
      action: "完成了 React 技能交换",
      type: "swap",
    });

    await ctx.db.insert("communityUpdates", {
      userId: alex,
      userName: "Alex Wang",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      action: "发布了新的吉他教学技能",
      type: "skill",
    });

    // 创建示例评价
    await ctx.db.insert("reviews", {
      userId: jessica,
      reviewerId: maria,
      reviewerName: "Maria Garcia",
      reviewerAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
      rating: 5,
      comment: "Jessica 是一位非常耐心的 React 老师，讲解清晰，例子丰富！",
      skillTag: "React",
    });

    return {
      message: "Demo 数据创建成功",
      users: { jessica, alex, maria },
    };
  },
});
