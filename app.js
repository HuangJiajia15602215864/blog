var createError = require('http-errors');
var express = require('express');
var path = require('path');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var settings = require('./settings');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logger = require('morgan');
var fs = require('fs')
var accessLog = fs.createWriteStream('access.log',{flags:'a'})
var errorLog = fs.createWriteStream('error.log',{flags:'a'})
var exphbs  = require('express-handlebars');

var app = express();

app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');
app.engine('hbs', exphbs({
  layoutsDir: 'views',// 设置布局模版文件的目录为 views 文件夹
  defaultLayout: 'layout',// 设置默认的页面布局模版为 layout.hbs 文件
  extname: '.hbs'//  模版文件使用的后缀名
}));
app.set('view engine', 'hbs');// 设置模板引擎

app.use(logger({stream:accessLog}));// 在终端显示日志
app.use(express.json());// 解析请求体
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());// cookie解析中间件
//app.use(bodyParser.json())
//app.use(bodyParser.urlencoded({extended: true,keepExtensions:true,uploadDir:'./public/images'}));// 保存文件后缀名，设置上传目录
app.use(session({
  secret:settings.cookieSecret,// 防止篡改cookie
  key:settings.db,// cookie名字
  cookie:{maxAge:1000*60*60*24*30},// cookie生存期
  store:new MongoStore({// 把会话存在数据库避免丢失
    db:settings.db,
    url:'mongodb://localhost:27017/blog'
  })
}));
app.use(flash());// 使用flash，用于存储信息
app.use(express.static(path.join(__dirname, 'public')));// 静态文件目录
app.use(function(err,req,res,next){
  var meta = '[' + new Date() + ']' + req.url + '\n'
  errorLog.write(meta + err.stack + '\n')
  next()
})

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};// 开发环境下的错误处理，输出错误信息
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
