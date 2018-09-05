// Muaz Khan      - www.MuazKhan.com
// MIT License    - www.WebRTC-Experiment.com/licence
// Documentation  - github.com/muaz-khan/RTCMultiConnection

// to use this signaling-server.js file:
// require('./Signaling-Server.js')(socketio_object); --- pass socket.io object
// require('./Signaling-Server.js')(nodejs_app_object); --- pass node.js "app" object

// stores all sockets, user-ids, extra-data and connected sockets
// you can check presence as following:
// var isRoomExist = listOfUsers['room-id'] != null;
var listOfUsers = {};
var tempuserlist = new Array();
var shiftedModerationControls = {};
var Memory = require('./src/memory/index')
// for scalable-broadcast demos
var ScalableBroadcast;

var _ = require('lodash')
var util = require("util")
var Api = require('./src/sequelize/mysql/api')



module.exports = exports = function (app, socketCallback) {
    socketCallback = socketCallback || function () { };


    if (!!app.listen) {
        var io = require('socket.io');
        //每隔5秒 服务端向浏览器 推送消息 by wqz 
        //将listofUsers中的userId、lng、lat、type、isTeamMember数据储存在tempuserlist中，并广播出去 
        setInterval(show, 10000);
        function show() {
            tempuserlist.splice(0, tempuserlist.length);
            for (userid in listOfUsers) {
                var temp = {
                    userId: userid,
                    lng: listOfUsers[userid].lng,
                    lat: listOfUsers[userid].lat,
                    type: listOfUsers[userid].type,
                    isTeamMember: listOfUsers[userid].isTeamMember
                }
                tempuserlist.push(temp);
            }
            
            io.emit('return-userlist', 1, tempuserlist);
        }

        try {
            // use latest socket.io
            io = io(app);
            io.on('connection', onConnection);
        } catch (e) {
            // otherwise fallback
            io = io.listen(app, {
                log: false,
                origins: '*:*'
            });

            io.set('transports', [
                'websocket',
                'xhr-polling',
                'jsonp-polling'
            ]);

            io.sockets.on('connection', onConnection);
        }
    } else {
        onConnection(app);
    }

    // to secure your socket.io usage: (via: docs/tips-tricks.md)
    // io.set('origins', 'https://domain.com');
    //编辑listOfUsers数组，初始化时赋值socket、isTeamMember  edit by wqz

    function appendUser(socket, isTeamMember) {
        var alreadyExist = listOfUsers[socket.userid];
        var extra = {};

        if (alreadyExist && alreadyExist.extra) {
            extra = alreadyExist.extra;
        }

        var params = socket.handshake.query;

        if (params.extra) {
            try {
                if (typeof params.extra === 'string') {
                    params.extra = JSON.parse(params.extra);
                }
                extra = params.extra;
            } catch (e) {
                extra = params.extra;
            }
        }

        listOfUsers[socket.userid] = {
            socket: socket,
            lng: null,
            lat: null,
            type: null,
            isTeamMember: isTeamMember,
            connectedWith: {},
            isPublic: false, // means: isPublicModerator
            extra: extra || {},
            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
        };
        //传递函数
        Memory.listOfUsers = listOfUsers
    }


    function onConnection(socket) {

        var params = socket.handshake.query;
        var socketMessageEvent = params.msgEvent || 'RTCMultiConnection-Message';

        var sessionid = params.sessionid;
        var autoCloseEntireSession = params.autoCloseEntireSession;


        if (params.enableScalableBroadcast) {
            if (!ScalableBroadcast) {
                ScalableBroadcast = require('./Scalable-Broadcast.js');
            }
            ScalableBroadcast(socket, params.maxRelayLimitPerUser);
        }

        // [disabled]
        if (false && !!listOfUsers[params.userid]) {
            params.dontUpdateUserId = true;

            var useridAlreadyTaken = params.userid;
            params.userid = (Math.random() * 1000).toString().replace('.', '');
            socket.emit('userid-already-taken', useridAlreadyTaken, params.userid);
            return;
        }

        socket.userid = params.userid;
        appendUser(socket);

        if (autoCloseEntireSession == 'false' && Object.keys(listOfUsers).length == 1) {
            socket.shiftModerationControlBeforeLeaving = true;
        }

        socket.on('shift-moderator-control-on-disconnect', function () {
            socket.shiftModerationControlBeforeLeaving = true;
        });



        socket.on('extra-data-updated', function (extra) {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].extra = extra;

                for (var user in listOfUsers[socket.userid].connectedWith) {
                    listOfUsers[user].socket.emit('extra-data-updated', socket.userid, extra);
                }
            } catch (e) {
                pushLogs('extra-data-updated', e);
            }
        });

        socket.on('get-remote-user-extra-data', function (remoteUserId, callback) {
            callback = callback || function () { };
            if (!remoteUserId || !listOfUsers[remoteUserId]) {
                callback('remoteUserId (' + remoteUserId + ') does NOT exist.');
                return;
            }
            callback(listOfUsers[remoteUserId].extra);
        });

        socket.on('become-a-public-moderator', function () {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = true;
            } catch (e) {
                pushLogs('become-a-public-moderator', e);
            }
        });

        var dontDuplicateListeners = {};
        socket.on('set-custom-socket-event-listener', function (customEvent) {
            if (dontDuplicateListeners[customEvent]) return;
            dontDuplicateListeners[customEvent] = customEvent;

            socket.on(customEvent, function (message) {
                try {
                    socket.broadcast.emit(customEvent, message);
                } catch (e) { }
            });
        });

        socket.on('dont-make-me-moderator', function () {
            try {
                if (!listOfUsers[socket.userid]) return;
                listOfUsers[socket.userid].isPublic = false;
            } catch (e) {
                pushLogs('dont-make-me-moderator', e);
            }
        });

        socket.on('get-public-moderators', function (userIdStartsWith, callback) {
            try {
                userIdStartsWith = userIdStartsWith || '';
                var allPublicModerators = [];
                for (var moderatorId in listOfUsers) {
                    if (listOfUsers[moderatorId].isPublic && moderatorId.indexOf(userIdStartsWith) === 0 && moderatorId !== socket.userid) {
                        var moderator = listOfUsers[moderatorId];
                        allPublicModerators.push({
                            userid: moderatorId,
                            extra: moderator.extra
                        });
                    }
                }

                callback(allPublicModerators);
            } catch (e) {
                pushLogs('get-public-moderators', e);
            }
        });


        //通知远程用户进行视频聊天  edit by wqz   
        socket.on('notify-remoteId', function (remoteUserIds, userId) {
            try {
                for (var i = 0; i < remoteUserIds.length; i++) {
                    if (listOfUsers[remoteUserIds[i]] && listOfUsers[remoteUserIds[i]].socket) {
                        listOfUsers[remoteUserIds[i]].socket.emit('join-our-room', userId)
                    } else {
                        listOfUsers[userId].socket.emit('invite-video-answer', +'用户不在线')
                    }
                }

            } catch (e) {

            }
        })


        /*
        * 单人聊天接口
        */


        //单聊接口
        //接收文本消息 edit by wqz
        socket.on('send-message-person', function (newMessage, callback) {
            var userIds = [];
            var mchatType = newMessage.chatType;
            var message = newMessage.content;
            var senderId = newMessage.senderId;
            var mType = newMessage.type;
            var receiverId = newMessage.receiverId;
            var sendDate = newMessage.sendDate;
            var senderName = newMessage.senderName;

            userIds.push(senderId);
            userIds.push(receiverId);
            //创建1vs1的聊天室，返回房间id(若已经创建,返回房间名）
            var data = {};
            data = {
                content: message,
                sender_id: senderId,
                sender_name: senderName,
                type: mType,
                send_date: sendDate,
                chatType: mchatType
            }
            Api.createRoomWithoutName(userIds).then((roomId) => {
                if (listOfUsers[receiverId] != null) {
                    listOfUsers[receiverId].socket.emit('receive-message', data)
                } else {
                    Api.sendGroupMessage(roomId.data.id, senderId, senderName, message, [receiverId], mType, mchatType, sendDate);
                }

                if (callback) {
                    callback(true);
                }
            })

        })

        /*
         *群聊接口
        */
        var roomInfo = [];
        //创建群聊时邀请的用户数不能少于3人
        socket.on("create-group", function (groupName, userId, userIds, callback) {
            var roomType = 2;
            if (userIds.length >= 3) {
                Api.createRoom(groupName, userIds, roomType).then((state) => {
                    //创建房间   state=成功：1 失败：-1 同名：2
                    if (state.re == 1) {
                        for (var i = 0; i < userIds.length; i++) {
                            if (listOfUsers[userIds[i]]) {
                                listOfUsers[userIds[i]].socket.join(groupName);
                            }
                        };
                    }
                    if (callback) {
                        callback(state);
                    }
                })
            }
        })

        //获取用户所在的所有群名
        socket.on("get-userRoom", function (userId, callback) {

            Api.getGroupChatRooms(userId).then((roomIds) => {
                if (roomIds && roomIds.data) {
                    socket.emit('receive-group-list', roomIds.data)
                } else {
                    socket.emit('receive-group-list', [])
                }
            })

            if (callback) {
                callback(true);
            }
        })


        //获取群中所在的所有用户
        socket.on("get-group-users", function (groupName, callback) {
            Api.getRoomMember(groupName).then((userIds) => {
                console.log(userIds);
                //获取当前群所有的成员
                if (userIds.data) {
                    socket.emit('receive-group-userslist', userIds)
                }
                else {
                    socket.emit('receive-group-userslist', []);
                }
            })
            if (callback) {
                callback(true);
            }
        })

        //接收加入分组消息 edit by wqz
        socket.on('join-group', function (groupId, userId, callback) {
            var user = userId;
            var room = groupId;
            Api.getRoomInfo(room).then((roomId) => {
                Api.joinGroup(roomId.id, user).then(() => {
                    socket.join(room);    // 加入房间
                    // 在发送用户离开的群聊信息
                    socket.to(room).emit('sys', user + '加入了房间', room);
                    console.log(user + '加入了' + room);
                })
            })
            if (callback) {
                callback(true);
            }
        });

        //邀请用户加入房间
        socket.on('invite-user-join-group', function (groupId, userIds, callback) {
            var user = userIds;
            var room = groupId;
            Api.getRoomInfo(room).then((roomId) => {
                for (var i = 0; i < user.length; i++) {
                    Api.joinGroup(roomId.id, user[i]).then(() => {
                        socket.join(room);    // 加入房间
                        // 在发送用户离开的群聊信息
                        socket.to(room).emit('sys', user[i] + '加入了房间', room);
                        console.log(user + '加入了' + room);
                    })
                }
            })
            if (callback) {
                callback(true);
            }
        });
        //用户退出群聊
        socket.on('leave-group', function (groupId, userId, callback) {
            var user = userId;
            var room = groupId;
            Api.leaveRoom(userId, groupId).then(() => {
                socket.to(room).emit('sys', user + '退出了房间', room);
                socket[userId].leave(room);
                socket.leave(room);
                Api.getRoomMember(room).then((users) => {
                    if (users.data.length == 1) {
                        Api.dismissRoom(room);
                    }
                })
                if (callback) {
                    callback(true);
                }
            })


        })


        //群聊消息 message文本消息，groupId群名，sender发送人，type消息类型,date消息发送时间
        socket.on('send-message-group', function (newMessage, callback) {
            var message = newMessage.content;
            var room = newMessage.receiverName;
            var roomId = newMessage.receiverId;
            var senderId = newMessage.senderId;
            var senderName =  newMessage.senderName;
            var mType = newMessage.type;
            var sendDate = newMessage.sendDate;
            var mchatType = newMessage.chatType;  //群聊的chatType 为2
            var data;
            data = {
                content: message,
                sender_id: senderId,
                sender_name:senderName,
                room_id: roomId,
                chat_type: mchatType,
                type: mType,
                send_date: sendDate
            }
            if (message && room && roomId && senderId && mType) {
                socket.to(room).emit('receive-message-group', data);
                if (callback) {
                    callback(true);
                }
                Api.getRoomMember(room).then((userIds) => {
                    console.log(userIds);
                    //获取当前群所有的成员
                    var users = [];
                    for (var i = 0; i < userIds.data.length; i++) {
                        users.push(userIds.data[i].user_id);
                    }
                    //筛选出当前不在线的群成员
                    var leaveUsers = [];
                    for (var i = 0; i < users.length; i++) {
                        // console.log(tempuserlist);
                        try {
                            if (listOfUsers[users[i]] == null) {
                                leaveUsers.push(users[i]);
                            } else {
                                console.log(listOfUsers[users[i]].socket.rooms);
                            }

                        } catch (error) {
                            console.log(error);
                        }
                    }
                    console.log(roomId.id);
                    if (leaveUsers != null) {
                        Api.sendGroupMessage(roomId, senderId,senderName, message, leaveUsers, mType, mchatType, sendDate).then(() => {
                        })
                    }
                    if (callback) {
                        callback(true);
                    }
                })
            } else {
                if (callback) {
                    callback(false);
                }
            }
        })

        //接受用户获取用户列表的消息，并发送用户信息 edit by wqz
        socket.on('get-userlist', function (userid, callback) {
            callback = callback || function () { };
            try {
                tempuserlist.splice(0, tempuserlist.length);
                for (socket.userid in listOfUsers) {
                    var temp = {
                        userId: socket.userid,
                        lng: listOfUsers[socket.userid].lng,
                        lat: listOfUsers[socket.userid].lat,
                        type: listOfUsers[socket.userid].type,
                        isTeamMember: listOfUsers[socket.userid].isTeamMember
                    }
                    tempuserlist.push(temp);
                }
                io.emit('return-userlist', 1, tempuserlist);
                io.emit('return-userlist', 1, _.keys(listOfUsers));
                console.log(tempuserlist);
                // io.emit('return-userlist',1,util.inspect(listOfUsers,{depth:null}));

            } catch (e) {
                pushLogs('get-userlist', e);
            }
        })

        //发送未读消息
        var sendUnreadMessageInBatch=function(messages,userid){
            if(messages!=null&&messages.length>0)
            {
                listOfUsers[userid].socket.emit("receive-message-unread", messages);
                //删除未读信息 
                for(var i=0;i<messages.length;i++)
                {
                    Api.deleteUnreadContent(messages[i].id, userid);
                }
            }
        }

        //接受客户端用户更新信息  edit by wqz
        socket.on('changed-uuid', function (newUserId, isTeamMember, callback) {

            console.log("==========================" + newUserId + isTeamMember + _.keys(listOfUsers));
            callback = callback || function () { };
            //用户登录时初始化群聊分组信息  by wqz 
            Api.getGroupChatRooms(newUserId).then((roomIds) => {
                console.log(listOfUsers[newUserId]);
                for (var i = 0; i < roomIds.data.length; i++) {
                    listOfUsers[newUserId].socket.join(roomIds.data[i].name);
                    socket.join(roomIds.data[i].name);
                }
                console.log(listOfUsers[newUserId].socket.rooms);
            })
            //用户注册时获取所有的未读聊天信息
            Api.fetchMessegeUnread(newUserId).then((messages) => {

                sendUnreadMessageInBatch(messages.data,newUserId)

                return 
                console.log(message.data.room_id + "房间id" + message.data.content + "message.sender_id");
                console.log(message);
                for (var i = 0; i < message.data.length; i++) {

                    Api.deleteUnreadContent(message.data[i].id, newUserId);
                    //群聊  data中会有room_id
                    if (message.data[i].roomType == 2) {
                        var data;
                        data = {
                            content: message.data[i].content,
                            sender_id: message.data[i].sender_id,
                            room_id: message.data[i].room_id,
                            type: message.data[i].type,
                            send_date: message.data[i].send_date
                        }
                        listOfUsers[newUserId].socket.emit("receive-message-group", data);
                        //群聊  data中无room_id
                    } else if (message.data[i].roomType == 1) {
                        var data;
                        data = {
                            content: message.data[i].content,
                            sender_id: message.data[i].sender_id,
                            type: message.data[i].type,
                            send_date: message.data[i].send_date
                        }
                        listOfUsers[newUserId].socket.emit("receive-message", data);
                    }
                }


            })



            //********************************/
            if (params.dontUpdateUserId) {
                delete params.dontUpdateUserId;
                return;
            }
            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].socket.userid == socket.userid) {
                    if (newUserId === socket.userid) {
                        listOfUsers[newUserId].isTeamMember = isTeamMember;
                        return;
                    }
                    var oldUserId = socket.userid;
                    listOfUsers[newUserId] = listOfUsers[oldUserId];
                    listOfUsers[newUserId].socket.userid = socket.userid = newUserId;
                    listOfUsers[newUserId].isTeamMember = isTeamMember;
                    delete listOfUsers[oldUserId];
                    callback();
                    return;
                }

                socket.userid = newUserId;
                appendUser(socket, isTeamMember);
                callback();
            } catch (e) {
                pushLogs('changed-uuid', e);
            }
        });

        //接受用户设置经纬度的消息  edit by wqz
        socket.on('set-lng-lat', function (mData) {
            var data = JSON.parse(mData);
            try {
                if (listOfUsers[data.userId]) {
                    listOfUsers[socket.userid].lat = data.lat;
                    listOfUsers[socket.userid].lng = data.lng;
                    listOfUsers[socket.userid].type = data.type;
                }
            } catch (e) {
                pushLogs('set-lng-lat', e);
            }

        });



        socket.on('set-password', function (password) {
            try {
                if (listOfUsers[socket.userid]) {
                    listOfUsers[socket.userid].password = password;
                }
            } catch (e) {
                pushLogs('set-password', e);
            }
        });

        socket.on('disconnect-with', function (remoteUserId, callback) {
            console.log("disconnect====================" + remoteUserId);
            try {
                if (listOfUsers[socket.userid] && listOfUsers[socket.userid].connectedWith[remoteUserId]) {
                    delete listOfUsers[socket.userid].connectedWith[remoteUserId];
                    socket.emit('user-disconnected', remoteUserId);
                }

                if (!listOfUsers[remoteUserId]) return callback();

                if (listOfUsers[remoteUserId].connectedWith[socket.userid]) {
                    delete listOfUsers[remoteUserId].connectedWith[socket.userid];
                    listOfUsers[remoteUserId].socket.emit('user-disconnected', socket.userid);
                }
                callback();
            } catch (e) {
                pushLogs('disconnect-with', e);
            }
        });

        socket.on('close-entire-session', function (callback) {
            try {
                var connectedWith = listOfUsers[socket.userid].connectedWith;
                Object.keys(connectedWith).forEach(function (key) {
                    if (connectedWith[key] && connectedWith[key].emit) {
                        try {
                        } catch (e) { }
                        connectedWith[key].emit('closed-entire-session', socket.userid, listOfUsers[socket.userid].extra);
                    }
                });

                delete shiftedModerationControls[socket.userid];
                callback();
            } catch (e) {
                pushLogs('close-entire-session', e);
            }
        });

        socket.on('check-presence', function (userid, callback) {
            if (!listOfUsers[userid]) {
                callback(false, userid, {});
            } else {
                callback(userid !== socket.userid, userid, listOfUsers[userid].extra);
            }
        });

        function onMessageCallback(message) {
            try {
                if (!listOfUsers[message.sender]) {
                    socket.emit('user-not-found', message.sender);
                    return;
                }

                if (!message.message.userLeft && !listOfUsers[message.sender].connectedWith[message.remoteUserId] && !!listOfUsers[message.remoteUserId]) {
                    listOfUsers[message.sender].connectedWith[message.remoteUserId] = listOfUsers[message.remoteUserId].socket;
                    listOfUsers[message.sender].socket.emit('user-connected', message.remoteUserId);

                    if (!listOfUsers[message.remoteUserId]) {
                        listOfUsers[message.remoteUserId] = {
                            socket: null,
                            connectedWith: {},
                            isPublic: false,
                            extra: {},
                            maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                        };
                    }

                    listOfUsers[message.remoteUserId].connectedWith[message.sender] = socket;

                    if (listOfUsers[message.remoteUserId].socket) {
                        listOfUsers[message.remoteUserId].socket.emit('user-connected', message.sender);
                    }
                }

                if (listOfUsers[message.sender].connectedWith[message.remoteUserId] && listOfUsers[socket.userid]) {
                    message.extra = listOfUsers[socket.userid].extra;
                    listOfUsers[message.sender].connectedWith[message.remoteUserId].emit(socketMessageEvent, message);
                }
            } catch (e) {
                pushLogs('onMessageCallback', e);
            }
        }

        function joinARoom(message) {
            var roomInitiator = listOfUsers[message.remoteUserId];

            if (!roomInitiator) {
                return;
            }

            var usersInARoom = roomInitiator.connectedWith;
            var maxParticipantsAllowed = roomInitiator.maxParticipantsAllowed;

            if (Object.keys(usersInARoom).length >= maxParticipantsAllowed) {
                socket.emit('room-full', message.remoteUserId);

                if (roomInitiator.connectedWith[socket.userid]) {
                    delete roomInitiator.connectedWith[socket.userid];
                }
                return;
            }

            var inviteTheseUsers = [roomInitiator.socket];
            Object.keys(usersInARoom).forEach(function (key) {
                inviteTheseUsers.push(usersInARoom[key]);
            });

            var keepUnique = [];
            inviteTheseUsers.forEach(function (userSocket) {
                if (userSocket.userid == socket.userid) return;
                if (keepUnique.indexOf(userSocket.userid) != -1) {
                    return;
                }
                keepUnique.push(userSocket.userid);

                if (params.oneToMany && userSocket.userid !== roomInitiator.socket.userid) return;

                message.remoteUserId = userSocket.userid;
                userSocket.emit(socketMessageEvent, message);
            });
        }

        var numberOfPasswordTries = 0;
        socket.on(socketMessageEvent, function (message, callback) {
            if (message.remoteUserId && message.remoteUserId === socket.userid) {
                // remoteUserId MUST be unique
                return;
            }

            try {
                if (message.remoteUserId && message.remoteUserId != 'system' && message.message.newParticipationRequest) {
                    if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].password) {
                        if (numberOfPasswordTries > 3) {
                            socket.emit('password-max-tries-over', message.remoteUserId);
                            return;
                        }

                        if (!message.password) {
                            numberOfPasswordTries++;
                            socket.emit('join-with-password', message.remoteUserId);
                            return;
                        }

                        if (message.password != listOfUsers[message.remoteUserId].password) {
                            numberOfPasswordTries++;
                            socket.emit('invalid-password', message.remoteUserId, message.password);
                            return;
                        }
                    }

                    if (listOfUsers[message.remoteUserId]) {
                        joinARoom(message);
                        return;
                    }
                }

                if (message.message.shiftedModerationControl) {
                    if (!message.message.firedOnLeave) {
                        onMessageCallback(message);
                        return;
                    }
                    shiftedModerationControls[message.sender] = message;
                    return;
                }

                // for v3 backward compatibility; >v3.3.3 no more uses below block
                if (message.remoteUserId == 'system') {
                    if (message.message.detectPresence) {
                        if (message.message.userid === socket.userid) {
                            callback(false, socket.userid);
                            return;
                        }

                        callback(!!listOfUsers[message.message.userid], message.message.userid);
                        return;
                    }
                }

                if (!listOfUsers[message.sender]) {
                    listOfUsers[message.sender] = {
                        socket: socket,
                        connectedWith: {},
                        isPublic: false,
                        extra: {},
                        maxParticipantsAllowed: params.maxParticipantsAllowed || 1000
                    };
                }

                // if someone tries to join a person who is absent
                if (message.message.newParticipationRequest) {
                    var waitFor = 60 * 10; // 10 minutes
                    var invokedTimes = 0;
                    (function repeater() {
                        if (typeof socket == 'undefined' || !listOfUsers[socket.userid]) {
                            return;
                        }

                        invokedTimes++;
                        if (invokedTimes > waitFor) {
                            socket.emit('user-not-found', message.remoteUserId);
                            return;
                        }

                        // if user just come online
                        if (listOfUsers[message.remoteUserId] && listOfUsers[message.remoteUserId].socket) {
                            joinARoom(message);
                            return;
                        }

                        setTimeout(repeater, 1000);
                    })();

                    return;
                }

                onMessageCallback(message);
            } catch (e) {
                pushLogs('on-socketMessageEvent', e);
            }
        });


        socket.on('disconnect', function () {
            console.log("disconnect2222222================" + socket.userid);
            try {
                if (socket && socket.namespace && socket.namespace.sockets) {
                    delete socket.namespace.sockets[this.id];
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                var message = shiftedModerationControls[socket.userid];

                if (message) {
                    delete shiftedModerationControls[message.userid];
                    onMessageCallback(message);
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            try {
                // inform all connected users
                if (listOfUsers[socket.userid]) {
                    var firstUserSocket = null;

                    for (var s in listOfUsers[socket.userid].connectedWith) {
                        if (!firstUserSocket) {
                            firstUserSocket = listOfUsers[socket.userid].connectedWith[s];
                        }

                        listOfUsers[socket.userid].connectedWith[s].emit('user-disconnected', socket.userid);

                        if (listOfUsers[s] && listOfUsers[s].connectedWith[socket.userid]) {
                            delete listOfUsers[s].connectedWith[socket.userid];
                            listOfUsers[s].socket.emit('user-disconnected', socket.userid);
                        }
                    }

                    if (socket.shiftModerationControlBeforeLeaving && firstUserSocket) {
                        firstUserSocket.emit('become-next-modrator', sessionid);
                    }
                }
            } catch (e) {
                pushLogs('disconnect', e);
            }

            delete listOfUsers[socket.userid];
            tempuserlist.splice(0, tempuserlist.length);
            for (socket.userid in listOfUsers) {
                var temp = {
                    userId: socket.userid,
                    lng: listOfUsers[socket.userid].lng,
                    lat: listOfUsers[socket.userid].lat,
                    type: listOfUsers[socket.userid].type
                }
                tempuserlist.push(temp);
            }
            io.emit('return-userlist', 1, tempuserlist);
            console.log(tempuserlist);
            // io.emit('return-userlist',1,_.keys(listOfUsers));
        });

        if (socketCallback) {
            socketCallback(socket);
        }

    }
};

var enableLogs = false;

try {
    var _enableLogs = require('./config.json').enableLogs;

    if (_enableLogs) {
        enableLogs = true;
    }
} catch (e) {
    enableLogs = false;
}

var fs = require('fs');

function pushLogs() {
    if (!enableLogs) return;

    var logsFile = process.cwd() + '/logs.json';

    var utcDateString = (new Date).toUTCString().replace(/ |-|,|:|\./g, '');

    // uncache to fetch recent (up-to-dated)
    uncache(logsFile);

    var logs = {};

    try {
        logs = require(logsFile);
    } catch (e) {

    }
    if (arguments[1] && arguments[1].stack) {
        arguments[1] = arguments[1].stack;
    }
    try {
        logs[utcDateString] = JSON.stringify(arguments, null, '\t');
        fs.writeFileSync(logsFile, JSON.stringify(logs, null, '\t'));
    } catch (e) {
        logs[utcDateString] = arguments.toString();
    }
}

// removing JSON from cache
function uncache(jsonFile) {
    searchCache(jsonFile, function (mod) {
        delete require.cache[mod.id];
    });

    Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
        if (cacheKey.indexOf(jsonFile) > 0) {
            delete module.constructor._pathCache[cacheKey];
        }
    });
}


function searchCache(jsonFile, callback) {
    var mod = require.resolve(jsonFile);

    if (mod && ((mod = require.cache[mod]) !== undefined)) {
        (function run(mod) {
            mod.children.forEach(function (child) {
                run(child);
            });
            callback(mod);
        })(mod);
    }
}
