
var expressRoute = require('express')();
var multer = require('multer')
var bodyParser = require('body-parser')
var path = require('path')
var fs = require('fs')
var cors = require('cors')

var mysql = require('./src/sequelize/mysql/index')
var RoomInfo = require('./src/sequelize/mysql/model/mobile-chat-room-info')
var Api = require('./src/sequelize/mysql/api')

var Memory = require('./src/memory/index')

expressRoute.use(cors())

//同步mysql表的模型
mysql.sequelize.sync({ force: false }).then(function () {
    console.log("Server successed to start");

    // Api.createRoom('test2',["danding","dym"]).then((res)=>{
    //     if(res.re==1)
    //     {
    //         console.log('创建房间成功')
    //     }
    // })

    // Api.getGroupChatRooms('user_1506589085874').then((res)=>{
    //     console.log()
    // })

    // Api.joinGroup(3,'dym').then(()=>{
    //     console.log()
    // })

    // Api.deleteRelation(2,['tt']).then(()=>{
    //     console.log()
    // })


    // Api.fetchMessegeUnread('danding').then((res)=>{
    //     console.log()
    // })

    // Api.createRoomWithoutName(['user1','user2']).then((res)=>{
    //     console.log()
    // })

    // Api.deleteUnreadContent(2,'ddd').then((res)=>{
    //     console.log()
    // })

    // Api.fetchMessegeUnread('dym').then((res)=>{
    //     console.log()
    // })


    //     console.log()
    // })

    // Api.getRoomMember('我的').then((res)=>{
    //     console.log()
    // })

    // Api.sendGroupMessage(170, 'u0001', 'file-1535369004463.mp4', ['user_150503'], 0).then((res)=>{
    //     console.log()
    // })

    // Api.fetchMessegeUnread('u0001').then((messages)=>{
    //         console.log(messages.data[0])
    //     })


    // Api.fetchMessegeUnread('user_1506589113190').then((roomIds) => {
    //     console.log('=======roomIds======')
    //     console.log(roomIds)
    // })

    // Api.createRoomWithoutName(['user_1506589113190','user_150757']).then((res)=>{
    //     console.log(res)
    // })

}).catch(function (err) {
    console.log("Server failed to start due to error: %s", err);
});



function resolveURL(url) {
    var isWin = !!process.platform.match(/^win/);
    if (!isWin) return url;
    return url.replace(/\//g, '\\');
}

// Please use HTTPs on non-localhost domains.
var isUseHTTPs = true;

// var port = 443;
var port = process.env.PORT || 9001;

try {
    process.argv.forEach(function (val, index, array) {
        if (!val) return;

        if (val === '--ssl') {
            isUseHTTPs = true;
        }
    });
} catch (e) { }


var ssl_key = fs.readFileSync(path.join(__dirname, resolveURL('fake-keys/1537956169118.key')));
var ssl_cert = fs.readFileSync(path.join(__dirname, resolveURL('fake-keys/1537956169118.pem')));
var ssl_cabundle = null;

// force auto reboot on failures
var autoRebootServerOnFailure = false;

// skip/remove this try-catch block if you're NOT using "config.json"
try {
    var config = require('./config.json');

    if ((config.port || '').toString() !== '9001') {
        port = parseInt(config.port);
    }

    if ((config.autoRebootServerOnFailure || '').toString() === 'true') {
        autoRebootServerOnFailure = true;
    }

    if ((config.isUseHTTPs || '').toString() === 'true') {
        isUseHTTPs = true;
    }

    ['ssl_key', 'ssl_cert', 'ssl_cabundle'].forEach(function (key) {
        if (!config['key'] || config['key'].toString().length) {
            return;
        }

        if (config['key'].indexOf('/path/to/') === -1) {
            if (key === 'ssl_key') {
                ssl_key = fs.readFileSync(path.join(__dirname, config['ssl_key']));
            }

            if (key === 'ssl_cert') {
                ssl_cert = fs.readFileSync(path.join(__dirname, config['ssl_cert']));
            }

            if (key === 'ssl_cabundle') {
                ssl_cabundle = fs.readFileSync(path.join(__dirname, config['ssl_cabundle']));
            }
        }
    });
} catch (e) { }

// see how to use a valid certificate:
// https://github.com/muaz-khan/WebRTC-Experiment/issues/62
var options = {
    key: ssl_key,
    cert: ssl_cert,
    ca: ssl_cabundle
};

// You don't need to change anything below

var server = require(isUseHTTPs ? 'https' : 'http');
var url = require('url');

var storage = multer.diskStorage({
    //设置上传后文件路径，uploads文件夹会自动创建。
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    //给上传文件重命名，获取添加后缀名
    filename: function (req, file, cb) {
        var fileFormat = (file.originalname).split(".");
        cb(null, file.fieldname + '-' + Date.now() + "." + fileFormat[fileFormat.length - 1]);
    }
});

var upload = multer({
    storage: storage
});

//var upload=mulerConfig.single('file');   


//body数据处理
var jsonParser = bodyParser.json()

// 创建 application/x-www-form-urlencoded 解析
var urlencodedParser = bodyParser.urlencoded({ extended: false })

//业务route处理
expressRoute.get('/file-download', urlencodedParser, function (request, response) {

    //路径
    var filePath = request.query.filePath
    
    if (filePath == undefined || filePath == null || filePath == 'null'||filePath=='') {
        response.end(404)
        return
    }

    //获取文件名
    var reg = /.*\/(.*)?/
    var regResult = reg.exec(filePath)
    var filename = null
    if (regResult != null && regResult[1] != null)
        filename = regResult[1]
    else
        filename = filePath


            
    var base64Encode=false
    if(request.query.base64Encode!==undefined&&request.query.base64Encode!==null)
        base64Encode=true    

    var suffix=null
    var mimeType='application/force-download'
    if(filename.indexOf('.')!=-1)
    {
        suffix=filename.substring(filename.lastIndexOf('.')+1)
        switch(suffix){
            case 'jpg':
                mimeType='image/jpeg'
            break;
            case 'png':
                mimeType='image/png'
            break;
            case 'mp4':
                mimeType='video/mpeg4'
            break;
            case 'amr':
                mimeType='audio/amr'
            break;
        }
    }
    
    console.log('mime===='+mimeType)

    var wholePath = path.resolve(__dirname, 'uploads')
    wholePath = path.join(wholePath, filePath)
    //判断文件是否存在
    fs.exists(wholePath, exists => {
        if (!exists) {
            response.writeHead(500, {'Content-type' : 'application/text'});
            response.end("png doesn't exist ")
            return
        }

        if(base64Encode)
        {
            var imageBuf = fs.readFileSync(wholePath);
            response.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Disposition': 'attachment;filename=' + filename
            });
            response.end('data:'+mimeType+';base64,'+imageBuf.toString("base64"))
            return
        }

        //读取文件大小
        fs.stat(wholePath, (err, stats) => {
            if (err) {
                response.write(500, {
                    'Content-Type': 'application/force-download',
                    'Content-Disposition': 'attachment; filename=' + filename
                })
                return
            }
            var fileSize = stats.size
            //创建流
            var f = fs.createReadStream(wholePath)
            response.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Content-Disposition': 'attachment;filename=' + filename
            });
            f.pipe(response);
        })
    })
})

//下载文件
expressRoute.get('/file-download', urlencodedParser, function (request, response) {

    //路径
    var filePath = request.query.filePath
    //获取文件名
    var reg = /.*\/(.*)?/
    var regResult = reg.exec(filePath)
    var filename = null
    if (regResult != null && regResult[1] != null)
        filename = regResult[1]
    else
        filename = filePath

    var wholePath = path.resolve(__dirname, 'uploads')
    wholePath = path.join(wholePath, filePath)
    //判断文件是否存在
    fs.exists(wholePath, exists => {
        if (!exists) {
            response.end(500, {
                'Content-Type': 'application/force-download',
                'Content-Disposition': 'attachment; filename=' + filename
            })
            return
        }



        //读取文件大小
        fs.stat(wholePath, (err, stats) => {
            if (err) {
                response.write(500, {
                    'Content-Type': 'application/force-download',
                    'Content-Disposition': 'attachment; filename=' + filename
                })
                return
            }
            var fileSize = stats.size
            //创建流
            var f = fs.createReadStream(wholePath)
            response.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'application/force-download',
                'Content-Disposition': 'attachment;filename=' + filename
            });
            f.pipe(response);
        })
    })
})


expressRoute.get('/*', function (request, response) {
    try {
        var uri = url.parse(request.url).pathname,
            filename = path.join(process.cwd(), uri);


        if (request.method !== 'GET' || path.join('/', uri).indexOf('../') !== -1) {
            response.writeHead(401, {
                'Content-Type': 'text/plain'
            });
            response.write('401 Unauthorized: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        if (filename && filename.search(/server.js|Scalable-Broadcast.js|Signaling-Server.js/g) !== -1) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        ['Video-Broadcasting', 'Screen-Sharing', 'Switch-Cameras'].forEach(function (fname) {
            if (filename && filename.indexOf(fname + '.html') !== -1) {
                filename = filename.replace(fname + '.html', fname.toLowerCase() + '.html');
            }
        });

        var stats;

        try {
            stats = fs.lstatSync(filename);

            if (filename && filename.search(/demos/g) === -1 && stats.isDirectory()) {
                if (response.redirect) {
                    response.redirect('/demos/');
                } else {
                    response.writeHead(301, {
                        'Location': '/demos/'
                    });
                }
                response.end();
                return;
            }
        } catch (e) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            // response.writeHead(404, {
            //     'Content-Type': 'text/html'
            // });

            if (filename.indexOf(resolveURL('/demos/MultiRTC/')) !== -1) {
                filename = filename.replace(resolveURL('/demos/MultiRTC/'), '');
                filename += resolveURL('/demos/MultiRTC/index.html');
            } else if (filename.indexOf(resolveURL('/demos')) !== -1) {
                filename = filename.replace(resolveURL('/demos/'), '');
                filename = filename.replace(resolveURL('/demos'), '');
                filename += resolveURL('/demos/index.html');
            } else {
                filename += resolveURL('/demos/index.html');
            }
        }

        var contentType = 'text/plain';
        if (filename.toLowerCase().indexOf('.html') !== -1) {
            contentType = 'text/html';
        }
        if (filename.toLowerCase().indexOf('.css') !== -1) {
            contentType = 'text/css';
        }
        if (filename.toLowerCase().indexOf('.png') !== -1) {
            contentType = 'image/png';
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write('404 Not Found: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            }

            try {
                var demos = (fs.readdirSync('demos') || []);

                if (demos.length) {
                    var h2 = '<h2 style="text-align:center;display:block;"><a href="https://www.npmjs.com/package/rtcmulticonnection-v3"><img src="https://img.shields.io/npm/v/rtcmulticonnection-v3.svg"></a><a href="https://www.npmjs.com/package/rtcmulticonnection-v3"><img src="https://img.shields.io/npm/dm/rtcmulticonnection-v3.svg"></a><a href="https://travis-ci.org/muaz-khan/RTCMultiConnection"><img src="https://travis-ci.org/muaz-khan/RTCMultiConnection.png?branch=master"></a></h2>';
                    var otherDemos = '<section class="experiment" id="demos"><details><summary style="text-align:center;">Check ' + (demos.length - 1) + ' other RTCMultiConnection-v3 demos</summary>' + h2 + '<ol>';
                    demos.forEach(function (f) {
                        if (f && f !== 'index.html' && f.indexOf('.html') !== -1) {
                            otherDemos += '<li><a href="/demos/' + f + '">' + f + '</a> (<a href="https://github.com/muaz-khan/RTCMultiConnection/tree/master/demos/' + f + '">Source</a>)</li>';
                        }
                    });
                    otherDemos += '<ol></details></section><section class="experiment own-widgets latest-commits">';

                    file = file.replace('<section class="experiment own-widgets latest-commits">', otherDemos);
                }
            } catch (e) { }

            try {
                var docs = (fs.readdirSync('docs') || []);

                if (docs.length) {
                    var html = '<section class="experiment" id="docs">';
                    html += '<details><summary style="text-align:center;">RTCMultiConnection Docs</summary>';
                    html += '<h2 style="text-align:center;display:block;"><a href="http://www.rtcmulticonnection.org/docs/">http://www.rtcmulticonnection.org/docs/</a></h2>';
                    html += '<ol>';

                    docs.forEach(function (f) {
                        if (f.indexOf('DS_Store') == -1) {
                            html += '<li><a href="https://github.com/muaz-khan/RTCMultiConnection/tree/master/docs/' + f + '">' + f + '</a></li>';
                        }
                    });

                    html += '</ol></details></section><section class="experiment own-widgets latest-commits">';

                    file = file.replace('<section class="experiment own-widgets latest-commits">', html);
                }
            } catch (e) { }

            response.writeHead(200, {
                'Content-Type': contentType
            });
            response.write(file, 'binary');
            response.end();
        });
    } catch (e) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('<h1>Unexpected error:</h1><br><br>' + e.stack || e.message || JSON.stringify(e));
        response.end();
    }
})



var sendFileMessage = function (file, newMessage) {
    var room = newMessage.groupName;
    var senderId = newMessage.sender_id;
    var senderName = newMessage.sender_name;
    var mType = newMessage.type;
    var receiverId = newMessage.receiverId;
    var receiverName = newMessage.receiverName;
    var room_name=newMessage.room_name
    var mChatType = newMessage.chat_type;
    var sendDate = newMessage.send_date;
    var clientType=newMessage.client_type
    var room_id=newMessage.room_id
    if(clientType=='mobile'&&mChatType=='1')
    {
    }else{
        room_id=parseInt(newMessage.room_id)
    }
   
    var message = file
    console.log(newMessage)
    if ((mChatType+'')== '1') {
        //单聊
        var data = {};
        data = {
            content: message,
            sender_id: senderId,
            sender_name: senderName,
            type: mType,
            send_date: sendDate,
            chat_type: mChatType,
            room_id:room_id
        }
        if(clientType=='mobile')
        {
            receiverId=room_id
            receiverName=room_name
        }else{
        }
        var userIds = [];
        userIds.push(senderId);
        userIds.push(receiverId);
        console.log('receiverId======'+receiverId)
        Api.createRoomWithoutName(userIds).then((roomId) => {
            console.log('user in Memory? -> '+Memory.listOfUsers[receiverId])
            if (Memory.listOfUsers[receiverId] != null) {
                Memory.listOfUsers[receiverId].socket.emit('receive-message', data)
            } else {
                Api.sendGroupMessage(roomId.data.id, senderId, senderName, message, [receiverId], mType, mChatType, sendDate);
            }
        });
    } else if ((''+mChatType) == '2') {
        //多人聊天
        var data = {};
        data = {
            content: message,
            sender_id: senderId,
            sender_name: senderName,
            room_id: room_id,
            room_name: room_name,
            chat_type: mChatType,
            type: mType,
            send_date: sendDate
        }

        if(Memory.listOfUsers[senderId]!=undefined&&Memory.listOfUsers[senderId]!=null)
            Memory.listOfUsers[senderId].socket.to(room_name).emit('receive-message-group', data);
        
         //筛选出当前不在线的群成员,并发送离线消息
        Api.getRoomMember(room_name).then((userIds) => {
            console.log(userIds);
            //获取当前群所有的成员
            var users = [];
            for (var i = 0; i < userIds.data.length; i++) {
                users.push(userIds.data[i].user_id);
            }
           
            var leaveUsers = [];
            for (var i = 0; i < users.length; i++) {
                try {
                    if (Memory.listOfUsers[users[i]] == null) {
                        leaveUsers.push(users[i]);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            if (leaveUsers&&leaveUsers.length>0) {
                Api.sendGroupMessage(room_id, senderId, senderName, message, leaveUsers, mType, mChatType, sendDate);
            }
        })

    }

}




//上传文件
expressRoute.post('/file-upload', function (request, response) {

    console.log('...............=====================================.')
    var up = upload.single('file')
    console.log("request=========")
    // console.log(request.file);
    up(request, response, function (err) {
        var file = request.file
        console.log(file)
        response.writeHead(200, { "Content-Type": "application/json" })
        response.end(JSON.stringify({ re: 1, url: file.filename }));
        var message = {};
        if (request.body.type == "audio") {
            var data = {
                duration: request.body.duration,
                url: file.filename
            }
            message = JSON.stringify(data);
        }
        else {
            message = file.filename;
        }
        //上传内容不能为空
        if (request.body && message) {
            sendFileMessage(message, request.body);
        }
    })
})



//下载文件
expressRoute.post('/file-download', urlencodedParser, function (request, response) {

    //路径
    var filePath = request.query.filePath
    //获取文件名
    var reg = /.*\/(.*)?/
    var regResult = reg.exec(filePath)
    var filename = null
    if (regResult != null && regResult[1] != null)
        filename = regResult[1]
    else
        filename = filePath

    var wholePath = path.resolve(__dirname, 'uploads')
    wholePath = path.join(wholePath, filePath)
    //判断文件是否存在
    fs.exists(wholePath, exists => {
        if (!exists) {
            response.end(500, {
                'Content-Type': 'application/force-download',
                'Content-Disposition': 'attachment; filename=' + filename
            })
            return
        }
        
        //读取文件大小
        fs.stat(wholePath, (err, stats) => {
            if (err) {
                response.write(500, {
                    'Content-Type': 'application/force-download',
                    'Content-Disposition': 'attachment; filename=' + filename
                })
                return
            }
            var fileSize = stats.size
            //创建流
            var f = fs.createReadStream(wholePath)
            response.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'application/force-download',
                'Content-Disposition': 'attachment;filename=' + filename
            });
            f.pipe(response);
        })
    })
})


function serverHandler(request, response) {
    try {
        var uri = url.parse(request.url).pathname,
            filename = path.join(process.cwd(), uri);

        if (request.method !== 'GET' || path.join('/', uri).indexOf('../') !== -1) {
            response.writeHead(401, {
                'Content-Type': 'text/plain'
            });
            response.write('401 Unauthorized: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        if (filename && filename.search(/server.js|Scalable-Broadcast.js|Signaling-Server.js/g) !== -1) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        ['Video-Broadcasting', 'Screen-Sharing', 'Switch-Cameras'].forEach(function (fname) {
            if (filename && filename.indexOf(fname + '.html') !== -1) {
                filename = filename.replace(fname + '.html', fname.toLowerCase() + '.html');
            }
        });

        var stats;

        try {
            stats = fs.lstatSync(filename);

            if (filename && filename.search(/demos/g) === -1 && stats.isDirectory()) {
                if (response.redirect) {
                    response.redirect('/demos/');
                } else {
                    response.writeHead(301, {
                        'Location': '/demos/'
                    });
                }
                response.end();
                return;
            }
        } catch (e) {
            response.writeHead(404, {
                'Content-Type': 'text/plain'
            });
            response.write('404 Not Found: ' + path.join('/', uri) + '\n');
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) {
            response.writeHead(404, {
                'Content-Type': 'text/html'
            });

            if (filename.indexOf(resolveURL('/demos/MultiRTC/')) !== -1) {
                filename = filename.replace(resolveURL('/demos/MultiRTC/'), '');
                filename += resolveURL('/demos/MultiRTC/index.html');
            } else if (filename.indexOf(resolveURL('/demos')) !== -1) {
                filename = filename.replace(resolveURL('/demos/'), '');
                filename = filename.replace(resolveURL('/demos'), '');
                filename += resolveURL('/demos/index.html');
            } else {
                filename += resolveURL('/demos/index.html');
            }
        }

        var contentType = 'text/plain';
        if (filename.toLowerCase().indexOf('.html') !== -1) {
            contentType = 'text/html';
        }
        if (filename.toLowerCase().indexOf('.css') !== -1) {
            contentType = 'text/css';
        }
        if (filename.toLowerCase().indexOf('.png') !== -1) {
            contentType = 'image/png';
        }

        fs.readFile(filename, 'binary', function (err, file) {
            if (err) {
                response.writeHead(500, {
                    'Content-Type': 'text/plain'
                });
                response.write('404 Not Found: ' + path.join('/', uri) + '\n');
                response.end();
                return;
            }

            try {
                var demos = (fs.readdirSync('demos') || []);

                if (demos.length) {
                    var h2 = '<h2 style="text-align:center;display:block;"><a href="https://www.npmjs.com/package/rtcmulticonnection-v3"><img src="https://img.shields.io/npm/v/rtcmulticonnection-v3.svg"></a><a href="https://www.npmjs.com/package/rtcmulticonnection-v3"><img src="https://img.shields.io/npm/dm/rtcmulticonnection-v3.svg"></a><a href="https://travis-ci.org/muaz-khan/RTCMultiConnection"><img src="https://travis-ci.org/muaz-khan/RTCMultiConnection.png?branch=master"></a></h2>';
                    var otherDemos = '<section class="experiment" id="demos"><details><summary style="text-align:center;">Check ' + (demos.length - 1) + ' other RTCMultiConnection-v3 demos</summary>' + h2 + '<ol>';
                    demos.forEach(function (f) {
                        if (f && f !== 'index.html' && f.indexOf('.html') !== -1) {
                            otherDemos += '<li><a href="/demos/' + f + '">' + f + '</a> (<a href="https://github.com/muaz-khan/RTCMultiConnection/tree/master/demos/' + f + '">Source</a>)</li>';
                        }
                    });
                    otherDemos += '<ol></details></section><section class="experiment own-widgets latest-commits">';

                    file = file.replace('<section class="experiment own-widgets latest-commits">', otherDemos);
                }
            } catch (e) { }

            try {
                var docs = (fs.readdirSync('docs') || []);

                if (docs.length) {
                    var html = '<section class="experiment" id="docs">';
                    html += '<details><summary style="text-align:center;">RTCMultiConnection Docs</summary>';
                    html += '<h2 style="text-align:center;display:block;"><a href="http://www.rtcmulticonnection.org/docs/">http://www.rtcmulticonnection.org/docs/</a></h2>';
                    html += '<ol>';

                    docs.forEach(function (f) {
                        if (f.indexOf('DS_Store') == -1) {
                            html += '<li><a href="https://github.com/muaz-khan/RTCMultiConnection/tree/master/docs/' + f + '">' + f + '</a></li>';
                        }
                    });

                    html += '</ol></details></section><section class="experiment own-widgets latest-commits">';

                    file = file.replace('<section class="experiment own-widgets latest-commits">', html);
                }
            } catch (e) { }

            response.writeHead(200, {
                'Content-Type': contentType
            });
            response.write(file, 'binary');
            response.end();
        });
    } catch (e) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('<h1>Unexpected error:</h1><br><br>' + e.stack || e.message || JSON.stringify(e));
        response.end();
    }
}

var app;

if (isUseHTTPs) {
    app = server.createServer(options, expressRoute);
    app.seth
} else {
    app = server.createServer(serverHandler);
}

function cmd_exec(cmd, args, cb_stdout, cb_end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    me.exit = 0;
    me.stdout = "";
    child.stdout.on('data', function (data) {
        cb_stdout(me, data)
    });
    child.stdout.on('end', function () {
        cb_end(me)
    });
}

function log_console() {
    console.log(foo.stdout);

    try {
        var pidToBeKilled = foo.stdout.split('\nnode    ')[1].split(' ')[0];
        console.log('------------------------------');
        console.log('Please execute below command:');
        console.log('\x1b[31m%s\x1b[0m ', 'kill ' + pidToBeKilled);
        console.log('Then try to run "server.js" again.');
        console.log('------------------------------');

    } catch (e) { }
}

function runServer() {
    app.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            if (e.address === '0.0.0.0') {
                e.address = 'localhost';
            }

            var socketURL = (isUseHTTPs ? 'https' : 'http') + '://' + e.address + ':' + e.port + '/';

            console.log('------------------------------');
            console.log('\x1b[31m%s\x1b[0m ', 'Unable to listen on port: ' + e.port);
            console.log('\x1b[31m%s\x1b[0m ', socketURL + ' is already in use. Please kill below processes using "kill PID".');
            console.log('------------------------------');

            foo = new cmd_exec('lsof', ['-n', '-i4TCP:9001'],
                function (me, data) {
                    me.stdout += data.toString();
                },
                function (me) {
                    me.exit = 1;
                }
            );

            setTimeout(log_console, 250);
        }
    });

    app = app.listen(port, process.env.IP || '0.0.0.0', function (error) {
        var addr = app.address();

        if (addr.address === '0.0.0.0') {
            addr.address = 'localhost';
        }

        var domainURL = (isUseHTTPs ? 'https' : 'http') + '://' + addr.address + ':' + addr.port + '/';

        console.log('------------------------------');

        console.log('socket.io is listening at:');
        console.log('\x1b[31m%s\x1b[0m ', '\t' + domainURL);

        if (!isUseHTTPs) {
            console.log('use --ssl to enable HTTPs:');
            console.log('\x1b[31m%s\x1b[0m ', '\t' + 'node server.js --ssl');
        }

        console.log('Your web-browser (HTML file) MUST set this line:');
        console.log('\x1b[31m%s\x1b[0m ', 'connection.socketURL = "' + domainURL + '";');

        if (addr.address != 'localhost' && !isUseHTTPs) {
            console.log('Warning:');
            console.log('\x1b[31m%s\x1b[0m ', 'Please set isUseHTTPs=true to make sure audio,video and screen demos can work on Google Chrome as well.');
        }

        console.log('------------------------------');
        console.log('Need help? http://bit.ly/2ff7QGk');
    });

    require('./Signaling-Server.js')(app, function (socket) {
        try {
            var params = socket.handshake.query;

            // "socket" object is totally in your own hands!
            // do whatever you want!

            // in your HTML page, you can access socket as following:
            // connection.socketCustomEvent = 'custom-message';
            // var socket = connection.getSocket();
            // socket.emit(connection.socketCustomEvent, { test: true });

            if (!params.socketCustomEvent) {
                params.socketCustomEvent = 'custom-message';
            }

            socket.on(params.socketCustomEvent, function (message) {
                try {
                    socket.broadcast.emit(params.socketCustomEvent, message);
                } catch (e) { }
            });
        } catch (e) { }
    });
}

if (autoRebootServerOnFailure) {
    // auto restart app on failure
    var cluster = require('cluster');
    if (cluster.isMaster) {
        cluster.fork();

        cluster.on('exit', function (worker, code, signal) {
            cluster.fork();
        });
    }

    if (cluster.isWorker) {
        runServer();
    }
} else {
    runServer();
}


