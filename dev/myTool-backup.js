'use strict';


function myTool() {
    return {
        connection: null,
        localUserid: null,
        video: null,
        tmp: null,
        videosContainer: null,
        // streams:[],
        toolInit: function () {


            var instance = this
            this.connection = new RTCMultiConnection();
            this.connection.socketURL = '/';
            // this.connection.socketURL ='https://www.jinghonginfotec.com:9001/';
            // this.connection.socketURL = 'https://58.56.100.10:9001/';
            // this.connection.attachStreams = {};


            this.connection.socketMessageEvent = 'video-conference';

            this.connection.session = {
                audio: true,
                video: true,
            };

            this.connection.sdpConstraints.mandatory = {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            };

            this.connection.videosContainer = document.getElementById('videos-container');
            //流的监听事件
            this.connection.onstream = function (event) {
               
                var existing = document.getElementById(event.streamid);
                if (existing && existing.parentNode) {
                    existing.parentNode.removeChild(existing);
                }

                event.mediaElement.removeAttribute('src');
                event.mediaElement.removeAttribute('srcObject');
                event.mediaElement.muted = true;
                event.mediaElement.volume = 0;

                // 地图上会有默认的视频元素
                var video = document.createElement('video');
                try {
                    video.setAttributeNode(document.createAttribute('autoplay'));
                    video.setAttributeNode(document.createAttribute('playsinline'));
                } catch (e) {
                    video.setAttribute('autoplay', true);
                    video.setAttribute('playsinline', true);
                }

                //本地视频流
                if (event.type === 'local') {
                    video.volume = 0;
                    try {
                        video.setAttributeNode(document.createAttribute('muted'));
                    } catch (e) {
                        video.setAttribute('muted', true);
                    }
                }
                video.srcObject = event.stream

                var width = parseInt(instance.connection.videosContainer.clientWidth / 3) - 20;
                var mediaElement = getHTMLMediaElement(video, {
                    title: event.userid,
                    buttons: ['full-screen'],
                    width: width,
                    showOnMouseEnter: false
                });
               

                instance.connection.videosContainer.appendChild(mediaElement);

                setTimeout(function () {
                    video.play();
                    console.log(mediaElement);
                    var div = document.createElement('div');
                    div.id = event.streamid || event.stream.id;
                    
                    div.appendChild(event.mediaElement);
                       
                    console.log(div)
                }, 5000);
            };

            this.connection.onmessage = this.onMessage

            this.connection.onstreamended = function (event) {
                var mediaElement = document.getElementById(event.streamid);
                if (mediaElement) {
                    mediaElement.parentNode.removeChild(mediaElement);
                }
            };

            this.connection.onopen = function () {

            };
            //退出会话的回调
            this.connection.onEntireSessionClosed = function (event) {

            }
        },
        CLogin: function (localUserId, lng, lat, type, isTeamMember, startDate) {
            var data = {};
            data = {
                userId: localUserId,
                lng: lng,
                lat: lat,
                type: type,
                isTeamMember: isTeamMember,
                startDate: startDate
            }


            var instance = this;
            //连接至socket
            this.connection.login(localUserId, isTeamMember, function () {

                //获取用户信息
                setTimeout(function () {
                    instance.connection.socket.emit('get-userlist', instance.connection.userid);
                }, 400)

                //接收录音信息
                instance.connection.socket.on('receive-audio', function (message, userid) {
                    var obj_url = window.URL.createVideoUrl(new Blob([message], { type: "audio/mp3" }))
                    document.getElementById("audio").src = obj_url
                    document.getElementById("audio").play()

                });
                //接收聊天消息
                instance.connection.socket.on('receive-message', function (message, userid) {
                    console.log("======接收到的聊天信息=====", message);

                });
                //接收未读聊天消息 
                instance.connection.socket.on('receive-unread-message', function (message, userid) {
                    console.log("======接收到的聊天信息=====", message);

                });

                //接收录音信息
                instance.connection.socket.on('receive-img', function (data) {
                    var mydiv = document.getElementById('file-container'); //获得dom对象 
                    var bigImg = document.createElement("img");     //创建一个img元素 
                    var oDiv = document.createElement('div');
                    document.body.appendChild(oDiv);
                    oDiv.id = "myDiv";

                    bigImg.width = "100";  //200个像素 不用加px  
                    bigImg.src = data;   //给img元素的src属性赋值  
                    mydiv.appendChild(bigImg);      //为dom添加子元素img

                });
                //接收群消息 
                instance.connection.socket.on('receive-message-group', function ( message) {
                    console.log("=========接收到群消息========" + message )
                });
                //接收用户所在的所有群的名字
                instance.connection.socket.on('receive-group-list', function (groupId, message) {
                    console.log("=========接收所有所在群的名称=====" + groupId + "+++++++++++" + message)
                });
                //接受用户建群成功或失败的消息  成功：1  失败：-1  失败房间同名：2
                instance.connection.socket.on('create-group-state', function (state) {
                    console.log("=========接收到创建群成功的消息=====" + state)
                });

                //接收群成员列表信息
                instance.connection.socket.on('receive-group-userslist', function (userIds) {
                    console.log("=========接收到群成员列表========");
                    console.log(userIds);
                });
                //接收系统信息
                instance.connection.socket.on('sys', function (groupId, message) {
                    console.log("=========接收到群列表========");
                    console.log(groupId);
                });
                //返回用户列表
                instance.connection.socket.on('return-userlist', function (responseCode, data) {
                    var userlist = new Array();
                    var peoplist = document.getElementById('makePeopList')
                    console.log(data);

                    while (peoplist.hasChildNodes()) {
                        peoplist.removeChild(peoplist.firstChild);
                    }
                    for (var i = 0; i < data.length; i++) {
                        userlist.push(data[i]);
                        var newItem = document.createElement("LI")
                        var textnode = document.createTextNode(data[i].userId)
                        newItem.appendChild(textnode)
                        peoplist.insertBefore(newItem, peoplist.childNodes[0]);
                    }

                });


                // instance.connection.socket.on('join-our-group', function (groupName) {
                //     console.log("=========接收到群列表========"+groupName+"========"+userId);
                //     instance.connection.socket.emit('join-group', groupName, instance.localUserid)
                // });

            });
        },
        openRoom: function (remotename) {

            console.log(remotename);
            this.connection.open(this.localUserid);
            this.connection.notify(remotename, this.localUserid);
        },
        //单聊发送消息
        sendMessage: function (message, mreceiverId, mType) {
            var instance = this;
            let data = {
                content: message,
                senderId: this.localUserid,
                senderName: "测试",
                receiverId: mreceiverId,
                type: mType,
                sendDate: mytool.getTaskTime(new Date().toString())
            }
            instance.connection.socket.emit('send-message-person', data);
        },
        //用户加入群
        joinGroup: function (groupId) {
            var instance = this;
            instance.connection.socket.emit('join-group', groupId, instance.localUserid)
        },
        //在群里发送文本消息
        sendMessageGroup: function (message, msender, mgroupId, mgroupName, mType) {
            var instance = this;
            let data = {
                content: message,
                senderId: msender,
                senderName: "测试",
                groupName: mgroupName,
                groupId: mgroupId,
                type: mType,
                sendDate: mytool.getTaskTime(new Date().toString())
            }

            instance.connection.socket.emit('send-message-group', data);
        },
        //用户创建群
        createGroup: function (groupId, userIds) {
            var instance = this;
            instance.connection.socket.emit('create-group', groupId, instance.localUserid, userIds,function(data){
                console.log(data);
            });
        },
        //用户退出群
        leaveGroup: function (groupId) {
            var instance = this;
            instance.connection.socket.emit('leave-group', groupId, instance.localUserid)
        },
        //获取用户所在群的列表
        getUserRoom: function (userid) {
            var instance = this;
            instance.connection.socket.emit('get-userRoom', userid);
        },
        //邀请用户加入群聊
        inviteUserJoinGroup: function (userIds) {
            var instance = this;
            instance.connection.socket.emit('invite-user-join-group', userIds);
        },
        //获取群中人员的列表
        getGroupUsers: function (groupName) {
            var instance = this;
            instance.connection.socket.emit('get-group-users', groupName);
        },
        //获取中介人
        getPublicModerators: function () {
            this.connection.getPublicModerators(function (moderators) {
                return moderators
            })
        },
        onMessage: function (event) {
            console.log("message got ->" + event.data);
        },
        sendFile: function (file) {
            this.connection.send(file);
        },
        getTaskTime: function (strDate) {
            console.log("原始时间格式：" + strDate);
            var date = new Date(strDate);
            var y = date.getFullYear();
            var m = date.getMonth() + 1;
            m = m < 10 ? ('0' + m) : m;
            var d = date.getDate();
            d = d < 10 ? ('0' + d) : d;
            var h = date.getHours();
            var minute = date.getMinutes();
            minute = minute < 10 ? ('0' + minute) : minute;
            var second = date.getSeconds();
            second = second < 10 ? ('0' + second) : second;
            var str = y + "-" + m + "-" + d + " " + h + ":" + minute + ":" + second;
            console.log("转换时间格式：" + str);
            return str;
        },
        disconnect:function(){
            this.connection.socket.disconnect()
        },
        reconnect:function(){
            this.connection.socket.reconnect()
        },
        //创建新巡线轨迹
        startLocation:function(mUserId,mTrack){
            var data={
               track: mTrack,
               userId: mUserId,
               startTime: mytool.getTaskTime(new Date().toString())
            }
            var instance = this;
            instance.connection.socket.emit('start-track', data,function(trackId){
                     console.log (trackId);
            });
        },
        //结束轨迹巡航
        endLocation:function(mUserId,mTrack){
            var data={
               track: mTrack,
               userId: mUserId,
               endTime: mytool.getTaskTime(new Date().toString())
            }
            var instance = this;
            instance.connection.socket.emit('end-track', data);
        },
        //发送实时位置  end-track
        emitLocation:function(mTrack,mLng,mLat,mTrackId){
            var data={
               trackId: mTrack,
               lng: mLng,
               lat: mLat,
               trackId:mTrackId
            }
            var track = JSON.stringify(data);
            var instance = this;
            instance.connection.socket.emit('set-lng-lat', track);
        }
    }

}


