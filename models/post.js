var mongodb = require('./db')
//var markdown = require('marked')

// 建立文章模型
function Post(name, head, title, tags, post) {
    this.name = name
    this.head = head
    this.title = title
    this.tags = tags
    this.post = post
}

module.exports = Post

// 存储文章
Post.prototype.save = function (callback) {
    var date = new Date()
    var time = {
        year: date.getFullYear(),
        day: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
        minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() +
            ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }
    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        reprint_info: {}, // 转载信息
        pv: 0
    }
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.insert(post, {
                safe: true
            }, function (err, user) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null, user[0])
            })
        })
    })
};

// 读取文章信息
Post.getTen = function (name, page, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            var query = {}
            if (name) {
                query.name = name
            }
            collection.count(query, function (err, total) {
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    mongodb.close()
                    if (err) {
                        return callback(err)
                    }
                    // docs.forEach(doc => {
                    //     doc.post = markdown(doc.post)
                    // });
                    callback(null, docs, total)
                })
            })
        })
    })
}

// 获取一篇文章信息
Post.getOne = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title,
            }, function (err, doc) {
                if (err) {
                    mongodb.close()
                    return callback(err)
                }
                if (doc) {
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    }, {
                        $inc: {
                            "pv": 1
                        } // 每访问一次，pv加1
                    }, function (err) {
                        mongodb.close()
                        if (err) {
                            return callback(err)
                        }
                    })
                    // doc.post = markdown(doc.post)
                    // if (doc.comments) {
                    //     doc.comments.forEach(function (comment) {
                    //         comment.content = markdown(comment.content)
                    //     })
                    // }
                    callback(null, doc)
                }
            })
        })
    })
}


// 编辑文章
Post.edit = function (name, day, title, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title,
            }, function (err, doc) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null, doc)
            })
        })
    })
}

// 更新文章
Post.update = function (name, day, title, post, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.update({
                "name": name,
                "time.day": day,
                "title": title,
            }, {
                $set: {
                    post: post
                }
            }, function (err) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null)
            })
        })
    })
}

// 删除文章
Post.remove = function(name, day, title, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err);
      }
      //读取 posts 集合
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //查询要删除的文档
        collection.findOne({
          "name": name,
          "time.day": day,
          "title": title
        }, function (err, doc) {
          if (err) {
            mongodb.close();
            return callback(err);
          }
          //如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
          var reprint_from = "";
          if (doc.reprint_info.reprint_from) {
            reprint_from = doc.reprint_info.reprint_from;
          }
          if (reprint_from != "") {
            //更新原文章所在文档的 reprint_to
            collection.update({
              "name": reprint_from.name,
              "time.day": reprint_from.day,
              "title": reprint_from.title
            }, {
              $pull: {
                "reprint_info.reprint_to": {
                  "name": name,
                  "day": day,
                  "title": title
              }}
            }, function (err) {
              if (err) {
                mongodb.close();
                return callback(err);
              }
            });
          }
   
          //删除转载来的文章所在的文档
          collection.remove({
            "name": name,
            "time.day": day,
            "title": title
          }, {
            w: 1
          }, function (err) {
            mongodb.close();
            if (err) {
              return callback(err);
            }
            callback(null);
          });
        });
      });
    });
  };

// 返回所有文章的存档信息
Post.getArchive = function (callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1,
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null, docs)
            })
        })
    })
}

// 返回所有标签
Post.getTags = function (callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.distinct("tags", function (err, docs) { // 返回tags键的所有不同值
                mongodb.close()
                console.log(docs)
                if (err) {
                    return callback(err)
                }
                callback(null, docs)
            })
        })
    })
}

// 返回特点标签下的所有文章
Post.getTag = function (tag, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1,
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null, docs)
            })
        })
    })
}

// 通过模糊搜索返回文章
Post.search = function (keyword, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err)
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close()
                return callback(err)
            }
            var patter = new RegExp("^.*" + keyword + ".*$", "i")
            collection.find({
                "title": patter
            }, {
                "name": 1,
                "time": 1,
                "title": 1,
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                mongodb.close()
                if (err) {
                    return callback(err)
                }
                callback(null, docs)
            })
        })
    })
}


//转载一篇文章
Post.reprint = function(reprint_from, reprint_to, callback) {
    mongodb.open(function (err, db) {
      if (err) {
        return callback(err);
      }
      db.collection('posts', function (err, collection) {
        if (err) {
          mongodb.close();
          return callback(err);
        }
        //找到被转载的文章的原文档
        collection.findOne({
          "name": reprint_from.name,
          "time.day": reprint_from.day,
          "title": reprint_from.title
        }, function (err, doc) {
          if (err) {
            mongodb.close();
            return callback(err);
          }
          var date = new Date();
          var time = {
              date: date,
              year : date.getFullYear(),
              month : date.getFullYear() + "-" + (date.getMonth() + 1),
              day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
              minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
              date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
          }
   
          delete doc._id;//注意要删掉原来的 _id
          doc.name = reprint_to.name;
          doc.head = reprint_to.head;
          doc.time = time;
          doc.title = (doc.title.search(/[reprint]/) > -1) ? doc.title : "[reprint]" + doc.title;
          doc.comments = [];
          doc.reprint_info = {"reprint_from": reprint_from};
          doc.pv = 0;
   
          //更新被转载的原文档的 reprint_info 内的 reprint_to
          collection.update({
            "name": reprint_from.name,
            "time.day": reprint_from.day,
            "title": reprint_from.title
          }, {
            $push: {
              "reprint_info.reprint_to": {
                "name": doc.name,
                "day": time.day,
                "title": doc.title
            }}
          }, function (err) {
            if (err) {
              mongodb.close();
              return callback(err);
            }
          });
          //将转载生成的副本修改后存入数据库，并返回存储后的文档
          collection.insert(doc, {
            safe: true
          }, function (err, post) {
            mongodb.close();
            if (err) {
              return callback(err);
            }
            callback(err, post.ops[0]);
          });
        });
      });
    });
  };