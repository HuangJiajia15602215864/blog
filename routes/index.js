var express = require('express');
var router = express.Router();
var crypto = require('crypto'); // 通过生成散列值加密密码
var fs = require('fs');
const User = require('../models/user.js');
const Post = require('../models/post.js');
const Comment = require('../models/comment.js');

// 主页
router.get('/', function (req, res, next) {
  var page = req.query.p ? parseInt(req.query.p) : 1
  Post.getTen(null, page, function (err, posts, total) {
    if (err) {
      posts = []
    }
    res.render('index', {
      title: '主页',
      posts: posts,
      page: page,
      isFirstPage: (page - 1) == 0,
      isLastPage: ((page - 1) * 10 + posts.length) == total,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 登录
router.get('/login', checkNotLogin)
router.get('/login', function (req, res, next) {
  res.render('login', {
    title: '登录',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});
// 注册
router.get('/reg', checkNotLogin)
router.get('/reg', function (req, res, next) {
  res.render('reg', {
    title: '注册',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});
// 发表文章
router.get('/post', checkLogin)
router.get('/post', function (req, res, next) {
  res.render('post', {
    title: '发表文章',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});
// 退出
router.get('/logout', checkLogin)
router.get('/logout', function (req, res, next) {
  req.session.user = null
  req.flash('success', '退出成功！')
  res.redirect('/')
});
// 上传
router.get('/upload', checkLogin)
router.get('/upload', function (req, res, next) {
  res.render('upload', {
    title: '文件上传',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});
// 用户页面
router.get('/u/:name', function (req, res, next) {
  var page = req.query.p ? parseInt(req.query.p) : 1
  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在！')
      return res.redirect('/')
    }
    Post.getTen(user.name, page, function (err, posts, total) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/')
      }
      res.render('user', {
        title: user.name,
        posts: posts,
        page: page,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 10 + posts.length) == total,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    })
  })
});
// 文章页面
router.get('/u/:name/:day/:title', function (req, res, next) {
  Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/')
    }
    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 编辑文章页面
router.get('/edit/:name/:day/:title', checkLogin)
router.get('/edit/:name/:day/:title', function (req, res, next) {
  var currentUser = req.session.user
  Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err)
      return res.redirect('back')
    }
    res.render('edit', {
      title: '编辑',
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 删除文章页面
router.get('/remove/:name/:day/:title', checkLogin)
router.get('/remove/:name/:day/:title', function (req, res, next) {
  var currentUser = req.session.user
  Post.remove(currentUser.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err)
      return res.redirect('back')
    }
    req.flash('success', '删除成功！')
    return res.redirect('/')
  })
});
// 转载文章
router.get('/reprint/:name/:day/:title', checkLogin);
router.get('/reprint/:name/:day/:title', function (req, res) {
  Post.edit(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect(back);
    }
    var currentUser = req.session.user,
      reprint_from = {
        name: post.name,
        day: post.time.day,
        title: post.title
      },
      reprint_to = {
        name: currentUser.name,
        head: currentUser.head
      };
    Post.reprint(reprint_from, reprint_to, function (err, post) {
      console.log(post)
      if (err) {
        req.flash('error', err);
        return res.redirect('back');
      }
      req.flash('success', '转载成功!');
      var url = '/u/' + post.name + '/' + post.time.day + '/' + post.title;
      //跳转到转载后的文章页面
      res.redirect(url);
    });
  });
});
// 文章存档页面
router.get('/archive', function (req, res, next) {
  Post.getArchive(function (err, posts) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/')
    }
    res.render('archive', {
      title: '存档',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 标签页面
router.get('/tags', function (req, res, next) {
  Post.getTags(function (err, posts) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/')
    }
    res.render('tags', {
      title: '标签',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 标签下文章页面
router.get('/tags/:tag', function (req, res, next) {
  Post.getTag(req.params.tag, function (err, posts) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/')
    }
    res.render('tag', {
      title: '标签：' + req.params.tag,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 搜索请求
router.get('/search', function (req, res, next) {
  Post.search(req.query.keyword, function (err, posts) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/')
    }
    res.render('search', {
      title: '搜索：' + req.query.keyword,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
});
// 友情链接
router.get('/links', function (req, res, next) {
  res.render('links', {
    title: '友情链接',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

router.post('/login', checkNotLogin)
router.post('/login', function (req, res) {
  var md5 = crypto.createHash('md5'),
    password = md5.update(req.body.password).digest('hex');
  User.get(req.body.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在！')
      return res.redirect('/login')
    }
    if (password != user.password) {
      req.flash('error', '密码错误！')
      return res.redirect('/login')
    }
    req.session.user = user
    req.flash('success', '登录成功！')
    return res.redirect('/')
  })
})

router.post('/reg', checkNotLogin)
router.post('/reg', function (req, res) {
  var name = req.body.name,
    password = req.body.password,
    password_re = req.body['password-repeat'];

  if (password != password_re) {
    req.flash('error', '密码不一致！')
    return res.redirect('/reg')
  }
  var md5 = crypto.createHash('md5'),
    password = md5.update(req.body.password).digest('hex');
  var newUser = new User({
    name: req.body.name,
    password: password,
    email: req.body.email
  })
  User.get(newUser.name, function (err, user) {
    if (user) {
      req.flash('error', '用户已存在！')
      return res.redirect('/reg')
    }
    newUser.save(function (err, user) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/reg')
      }
      req.session.user = user
      req.flash('success', '注册成功！')
      res.redirect('/')
    })
  })
})

router.post('/post', checkLogin)
router.post('/post', function (req, res) {
  var currentUser = req.session.user,
    tags = [req.body.tag1, req.body.tag2, req.body.tag3]
  post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post)
  post.save(function (err) {
    if (err) {
      req.flash('error', err)
      return res.redirect('/reg')
    }
    req.flash('success', '发布成功！')
    return res.redirect('/')
  })
})

router.post('/upload', checkLogin)
router.post('/upload', function (req, res) {
  for (var i in req.files) {
    console.log(i)
    if (req.files[i].size == 0) {
      fs.unlinkSync(req.files[i].path) // 同步方式删除文件
    } else {
      var target_path = './public/images/' + req.files[i].name
      fs.renameSync(req.files[i].path, target_path) // 同步方式重命名文件
    }
  }
  req.flash('success', '文件上传成功！')
  return res.redirect('/upload')
})


router.post('/edit/:name/:day/:title', checkLogin)
router.post('/edit/:name/:day/:title', function (req, res, next) {
  var currentUser = req.session.user
  Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
    var url = '/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title
    if (err) {
      req.flash('error', err)
      return res.redirect(url)
    }
    req.flash('success', '修改成功！')
    return res.redirect(url)
  })
})

router.post('/u/:name/:day/:title', function (req, res, next) {
  var date = new Date(),
    time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() +
    ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
  var md5 = crypto.createHash('md5'),
    email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
    head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48"

  var comment = {
    name: req.body.name,
    head: head,
    email: req.body.email,
    website: req.body.website,
    time: time,
    content: req.body.content,
  }
  var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment)
  newComment.save(function (err) {
    if (err) {
      req.flash('error', err)
      return res.redirect('back')
    }
    req.flash('success', '留言成功！')
    return res.redirect('back')
  })
});

router.use(function (req, res) {
  res.render('404')
})

// 登录校验
function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录！')
    res.redirect('/login')
  }
  next()
}

// 未登录校验
function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录！')
    res.redirect('back')
  }
  next()
}

module.exports = router;