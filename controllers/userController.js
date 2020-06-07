// 引入資料庫
const db = require('../models')
const User = db.User
const Tweet = db.Tweet
const Like = db.Like
const Reply = db.Reply
const Blockship = db.Blockship
const moment = require('moment')
const Followship = db.Followship
const bcrypt = require('bcryptjs')
const helpers = require("../_helpers")
const Op = require('Sequelize').Op
const fs = require('fs')
const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID


const userController = {

  getTweets: async (req, res) => {
    try {
      let blockships = await Blockship.findAll({
        where: {
          [Op.or]: [
            { blockerId: req.user.id },
            { blockingId: req.user.id }
          ]
        }
      })

      blockships = blockships.map(blockship => ({
        ...blockship.dataValues
      }))

      // blockshipsIdArr = 封鎖我的人 && 我封鎖的人的 ID
      const blockshipsIdArr = []

      blockships.forEach(blockship => {
        if (blockship.blockerId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockerId)
        }
        if (blockship.blockingId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockingId)
        }
      })

      if (blockshipsIdArr.includes(Number(req.params.id))) {
        return res.render('getBlockMessage')
      }

      const otherUserId = Number(req.params.id)
      let isOwner = false
      if (otherUserId === helpers.getUser(req).id) {
        isOwner = true
      }

      let otherUser = await User.findByPk(otherUserId, {
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' },
          { model: User, as: 'Blockers' },
          { model: User, as: 'Blockings' },
          Like
        ]
      })

      if (!otherUser) {
        throw new Error('otherUser is not found')
      }

      // ------------------ otherUser 資料整理 -------------------
      otherUser = {
        ...otherUser.dataValues,
        introduction: otherUser.introduction.substring(0, 30),
        Followers: otherUser.Followers.map(follower => ({
          ...follower.dataValues
        })),
        Followings: otherUser.Followings.map(following => ({
          ...following.dataValues
        })),
        Blockers: otherUser.Blockers.map(blocker => ({
          ...blocker.dataValues
        })),
        Blockings: otherUser.Blockings.map(blocking => ({
          ...blocking.dataValues
        })),
        Likes: otherUser.Likes.map(like => ({
          ...like.dataValues
        })),
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(otherUser.id)
      }

      console.log(otherUser.isFollowed)

      let tweets = await Tweet.findAll({
        order: [["createdAt", "DESC"]],
        where: {
          UserId: otherUserId
        },
        include: [
          Like,
          User,
          { model: Reply, include: [User] },
          { model: User, as: 'LikedUsers' }
        ]
      })

      // ------------------ Tweets 資料整理 -------------------
      tweets = tweets.map(tweet => ({
        ...tweet.dataValues,

        User: tweet.User.dataValues,

        Replies: tweet.dataValues.Replies.map(reply => ({
          ...reply.dataValues,
          User: reply.User.dataValues
        })),

        LikedUsers: tweet.dataValues.LikedUsers.map(user => ({
          ...user.dataValues
        })),
        isLiked: tweet.LikedUsers.map(d => d.id).includes(helpers.getUser(req).id),
        description: tweet.description ? tweet.description.substring(0, 50) : null,
        updatedAt: tweet.updatedAt ? moment(tweet.updatedAt).format('YYYY-MM-DD, hh:mm') : '-',
        likedCount: tweet.LikedUsers.length
      }))

      return res.render('getTweets', { otherUser, tweets, isOwner })
    } catch (error) {
      console.log('error', error)
    }
  },
  getFollowings: async (req, res) => {
    try {
      let blockships = await Blockship.findAll({
        where: {
          [Op.or]: [
            { blockerId: req.user.id },
            { blockingId: req.user.id }
          ]
        }
      })

      blockships = blockships.map(blockship => ({
        ...blockship.dataValues
      }))

      // blockshipsIdArr = 封鎖我的人 && 我封鎖的人的 ID
      const blockshipsIdArr = []

      blockships.forEach(blockship => {
        if (blockship.blockerId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockerId)
        }
        if (blockship.blockingId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockingId)
        }
      })

      if (blockshipsIdArr.includes(Number(req.params.id))) {
        return res.render('getBlockMessage')
      }

      const userId = Number(req.params.id)
      let isOwner = userId === helpers.getUser(req).id ? true : false;

      const { dataValues } = await User.findByPk(userId) ? await User.findByPk(userId, {
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings', },
          Like,
          Tweet,
          Reply
        ],
      }) : null

      if (!dataValues) {
        throw new Error("user is not found");
      }
      let userData = {}
      userData = {
        id: dataValues.id,
        avatar: dataValues.avatar,
        name: dataValues.name,
        introduction: dataValues.introduction ? dataValues.introduction.substring(0, 30) : null,
        TweetsNumber: dataValues.Tweets.length,
        FollowersNumber: dataValues.Followers.length,
        FollowingsNumber: dataValues.Followings.length,
        LikesNumber: dataValues.Likes.length,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(userId)
      }

      const followings = dataValues.Followings.reverse().map(following => ({
        id: following.id,
        avatar: following.avatar,
        name: following.name,
        introduction: following.introduction ? following.introduction.substring(0, 20) : null,
      }))

      return res.render('getFollowings', { userData, followings: followings, isOwner })
    } catch (error) {
      console.log("error", error);
    }
  },
  getFollowers: async (req, res) => {
    try {
      let blockships = await Blockship.findAll({
        where: {
          [Op.or]: [
            { blockerId: req.user.id },
            { blockingId: req.user.id }
          ]
        }
      })

      blockships = blockships.map(blockship => ({
        ...blockship.dataValues
      }))

      // blockshipsIdArr = 封鎖我的人 && 我封鎖的人的 ID
      const blockshipsIdArr = []

      blockships.forEach(blockship => {
        if (blockship.blockerId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockerId)
        }
        if (blockship.blockingId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockingId)
        }
      })

      if (blockshipsIdArr.includes(Number(req.params.id))) {
        return res.render('getBlockMessage')
      }
      const userId = Number(req.params.id)
      let isOwner = userId === helpers.getUser(req).id ? true : false;
      const { dataValues } = await User.findByPk(userId) ? await User.findByPk(userId, {
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' },
          Like,
          Tweet,
          Reply
        ]
      }) : null

      if (!dataValues) {
        throw new Error("user is not found");
      }
      let userData = {}
      userData = {
        id: dataValues.id,
        avatar: dataValues.avatar,
        name: dataValues.name,
        introduction: dataValues.introduction ? dataValues.introduction.substring(0, 30) : null,
        TweetsNumber: dataValues.Tweets.length,
        FollowersNumber: dataValues.Followers.length,
        FollowingsNumber: dataValues.Followings.length,
        LikesNumber: dataValues.Likes.length,
        isFollowing: helpers.getUser(req).Followings.map(d => d.id).includes(userId)
      }

      const followers = dataValues.Followers.reverse().map(follower => ({
        id: follower.id,
        avatar: follower.avatar,
        name: follower.name,
        introduction: follower.introduction ? follower.introduction.substring(0, 20) : null,
        isOwnFollower: follower.id === helpers.getUser(req).id ? true : false,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(follower.id)
      }))

      return res.render('getFollowers', { userData, followers: followers, isOwner })
    } catch (error) {
      console.log("error", error);
    }
  },
  getLikes: async (req, res) => {
    try {
      let blockships = await Blockship.findAll({
        where: {
          [Op.or]: [
            { blockerId: req.user.id },
            { blockingId: req.user.id }
          ]
        }
      })

      blockships = blockships.map(blockship => ({
        ...blockship.dataValues
      }))

      // blockshipsIdArr = 封鎖我的人 && 我封鎖的人的 ID
      const blockshipsIdArr = []

      blockships.forEach(blockship => {
        if (blockship.blockerId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockerId)
        }
        if (blockship.blockingId !== req.user.id) {
          blockshipsIdArr.push(blockship.blockingId)
        }
      })

      if (blockshipsIdArr.includes(Number(req.params.id))) {
        return res.render('getBlockMessage')
      }

      const userId = Number(req.params.id)
      let isOwner = userId === helpers.getUser(req).id ? true : false;

      const { dataValues } = await User.findByPk(userId) ? await User.findByPk(userId, {
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' },
          Like,
          Tweet,
          Reply
        ]
      }) : null

      const tweetsData = await Tweet.findAll({ include: [Like, Reply, User] })

      if (!dataValues) {
        throw new Error("user is not found");
      }

      let userData = {}
      userData = {
        id: dataValues.id,
        name: dataValues.name,
        avatar: dataValues.avatar,
        introduction: dataValues.introduction ? dataValues.introduction.substring(0, 30) : null,
        TweetsNumber: dataValues.Tweets.length,
        FollowersNumber: dataValues.Followers.length,
        FollowingsNumber: dataValues.Followings.length,
        LikesNumber: dataValues.Likes.length,
        isFollowing: req.user.Followings.map(d => d.id).includes(userId)
      }


      const likedTweets = tweetsData.filter(tweet =>
        dataValues.Likes.map(like => like.TweetId).includes(tweet.id)
      )

      const tweets = likedTweets.reverse().map(tweet => ({
        id: tweet.id,
        description: tweet.description
          ? tweet.description.substring(0, 50)
          : null,
        updatedAt: tweet.updatedAt
          ? moment(tweet.updatedAt).format(`YYYY-MM-DD, hh:mm`)
          : "-",
        likedCount: tweet.Likes.length,
        repliesCount: tweet.Replies.length,
        userId: tweet.UserId,
        userAvatar: tweet.User.avatar,
        userName: tweet.User.name
      }));

      return res.render('getLikes', { userData, tweets, isOwner })
    } catch (error) {
      console.log("error", error);
    }
  },
  addFollowing: async (req, res) => {
    try {
      const findOne = await Followship.findOne({
        where: {
          [Op.and]: [
            { followerId: req.user.id },
            { followingId: req.body.id }
          ]
        }
      })
      if (!findOne) {
        await Followship.create({
          followerId: req.user.id,
          followingId: req.body.id
        })
      }

      return res.redirect("back");
    } catch (error) {
      console.log("error", error);
    }
  },
  deleteFollowing: async (req, res) => {
    try {
      const followship = await Followship.findOne({
        where: {
          [Op.and]: [{ followerId: req.user.id }, { followingId: req.params.userId }]
        }
      }).then((followship) => {
        followship.destroy()
      })
      return res.redirect('back')
    } catch (error) {
      console.log("error", error);
    }
  },
  getEdit: async (req, res) => {
    try {
      const userId = Number(req.params.id)
      //判斷是否為owner 不然退出
      if (userId === req.user.id) {
        const { dataValues } = (await User.findByPk(userId))
          ? await User.findByPk(userId)
          : null;

        if (!dataValues) {
          throw new Error("user is not found");
        }
        let user = {};
        user = { ...dataValues };

        return res.render("getEdit", { user });
      } else {
        return res.redirect('/')
      }

    } catch (error) {
      console.log("error", error);
    }
  },
  postEdit: async (req, res) => {
    try {
      if (!req.body.name) {
        req.flash('error_messages', { error_messages: "請至少輸入姓名" })
        return res.redirect('back')
      }

      const userId = req.params.id;

      const { file } = req;
      if (file) {
        imgur.setClientID(IMGUR_CLIENT_ID)
        // const data = fs.readFileSync(file.path);
        // const writeFile = fs.writeFileSync(`upload/${file.originalname}`, data);
        const uploadImage = await imgur.upload(file.path, async (err, image) => {
          try {
            const updateUser = await User.findByPk(userId).then((user) => {
              user.update({
                name: req.body.name,
                introduction: req.body.introduction,
                avatar: file ? image.data.link : null,
              });
            });
            req.flash('success_messages', "個人資料已成功修改")
            return res.redirect(`/users/${userId}/tweets`);
          } catch (error) {
            console.log('error', error)
          }

        })
      } else {
        const updateUser = await User.findByPk(userId).then((user) => {
          user.update({
            name: req.body.name,
            introduction: req.body.introduction,
            avatar: this.avatar,
          });
        });

        req.flash('success_messages', "個人資料已成功修改")
        return res.redirect(`/users/${userId}/tweets`);
      }
    } catch (error) {
      console.log("error", error);
    }
  },

  getBlockings: async (req, res) => {
    try {
      const otherUserId = Number(req.params.id)
      let isOwner = false
      if (otherUserId === req.user.id) {
        isOwner = true
      }

      let otherUser = await User.findByPk(otherUserId, {
        include: [
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' },
          Like
        ]
      })

      if (!otherUser) {
        throw new Error('otherUser is not found')
      }

      // ------------------ otherUser 資料整理 -------------------
      otherUser = {
        ...otherUser.dataValues,
        introduction: otherUser.introduction.substring(0, 30),
        Followers: otherUser.Followers.map(follower => ({
          ...follower.dataValues
        })),
        Followings: otherUser.Followings.map(following => ({
          ...following.dataValues
        })),
        // Blockings: otherUser.Blockings.map(blocking => ({
        //   ...blocking.dataValues
        // })),
        Likes: otherUser.Likes.map(like => ({
          ...like.dataValues
        })),
        isFollowing: otherUser.Followers.map(d => d.id).includes(req.user.id)
      }

      let blockings = await User.findByPk(req.user.id, {
        include: [{ model: User, as: 'Blockings' }]
      })

      blockings = blockings.dataValues.Blockings.map(blocking => ({
        ...blocking.dataValues
      }))

      blockings = blockings.map(blocking => ({
        ...blocking,
        introduction: blocking.introduction.substring(0, 30)
      }))

      let tweets = await Tweet.findAll({
        where: {
          UserId: otherUserId
        },
        include: [
          Like,
          User,
          { model: Reply, include: [User] },
          { model: User, as: 'LikedUsers' }
        ]
      })

      // ------------------ Tweets 資料整理 -------------------
      tweets = tweets.map(tweet => ({
        ...tweet.dataValues,

        User: tweet.User.dataValues,

        Replies: tweet.dataValues.Replies.map(reply => ({
          ...reply.dataValues,
          User: reply.User.dataValues
        })),

        LikedUsers: tweet.dataValues.LikedUsers.map(user => ({
          ...user.dataValues
        })),
        isLiked: tweet.LikedUsers.map(d => d.id).includes(helpers.getUser(req).id),
        description: tweet.description ? tweet.description.substring(0, 50) : null,
        updatedAt: tweet.updatedAt ? moment(tweet.updatedAt).format('YYYY-MM-DD, hh:mm') : '-',
        likedCount: tweet.LikedUsers.length
      }))

      return res.render('getBlockings', { otherUser, tweets, isOwner, blockings })
    } catch (error) {
      console.log('error', error)
    }
  },

  postBlock: async (req, res) => {
    try {
      // 先找出封鎖者與被封鎖者有無 follow 關係
      // 有 => 先刪除 follow 關係再建立封鎖關係
      // 無 => 直接建立封鎖關係
      const follower = await Followship.findOne({
        where: {
          [Op.and]: [
            { followerId: req.user.id },
            { followingId: req.params.userId }
          ]
        }
      })
      if (follower) {
        await follower.destroy()
      }

      const following = await Followship.findOne({
        where: {
          [Op.and]: [
            { followerId: req.params.userId },
            { followingId: req.user.id }
          ]
        }
      })
      if (following) {
        await following.destroy()
      }

      const blockships = await Blockship.findOne({
        where: {
          [Op.and]: [
            { blockerId: req.user.id },
            { blockingId: req.body.userId }
          ]
        }
      })

      if (!blockships) {
        await Blockship.create({
          blockerId: req.user.id,
          blockingId: req.body.userId
        })
      }

      req.flash('success_messages', '已成功封鎖該用戶')
      return res.redirect(`/users/${req.user.id}/blockings`)
    } catch (error) {
      console.log(error)
      req.flash('error_messages', { error_messages: '資料庫異常，未能成功封鎖該用戶！' })
      return res.redirect('/')
    }
  },

  deleteBlock: async (req, res) => {
    try {
      const destroyBlock = await Blockship.findOne({
        where: {
          [Op.and]: [
            { blockerId: req.user.id },
            { blockingId: req.params.id }
          ]
        }
      })

      req.flash('success_messages', '已成功解除封鎖該用戶')
      await destroyBlock.destroy()
      return res.redirect('back')
    } catch (error) {
      console.log(error)
      req.flash('error_messages', { error_messages: '資料庫異常，未能成功解除封鎖該用戶！' })
      return res.redirect('/')
    }
  },

  signUpPage: (req, res) => {
    return res.render("signup");
  },

  signUp: async (req, res) => {
    try {
      const error_messages = []

      if (req.body.passwordCheck !== req.body.password) {
        error_messages.push({ error_messages: '兩次密碼輸入不同！' })
      }

      if (!req.body.name || !req.body.password || !req.body.email || !req.body.passwordCheck) {
        error_messages.push({ error_messages: '請填寫所有欄位！' })
      }

      if (req.body.password.length < 8) {
        error_messages.push({ error_messages: '密碼至少 8 位數！' })
      }

      // confirm unique name
      let user = await User.findOne({ where: { name: req.body.name } })
      if (user) {
        error_messages.push({ error_messages: '暱稱重複！' })
      }

      // confirm unique user
      user = await User.findOne({ where: { email: req.body.email } })
      if (user) {
        error_messages.push({ error_messages: '信箱重複！' })
      }

      if (error_messages.length !== 0) {
        req.flash('error_messages', error_messages)
        return res.redirect("/signup");
      }

      await User.create({
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(
          req.body.password,
          bcrypt.genSaltSync(10),
          null
        ),
      })

      req.flash("success_messages", "成功註冊帳號！");
      return res.redirect("/signin");
    } catch (error) {
      console.log(error)
      req.flash('error_messages', { error_messages: '資料庫異常，註冊帳號失敗！' });
      return res.redirect("/signup");
    }
  },

  signInPage: (req, res) => {
    return res.render("signin");
  },

  signIn: (req, res) => {
    req.session.username = helpers.getUser(req).name
    req.session.avatar = helpers.getUser(req).avatar
    req.session.id = helpers.getUser(req).passport
    req.flash("success_messages", "成功登入！");
    res.redirect("/tweets");
  },

  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  }

}

module.exports = userController;
