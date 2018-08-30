'use strict';


function myTool() {
    return {
        videosContainer:null,
        connection: null,
        localUserid: null,
        video: null,
        tmp: null,
        audio: null,
        rec: null,
        // streams:[],
        toolInit: function () {

            var instance=this
            this.connection = new RTCMultiConnection();
            this.connection.socketURL = '/';
            this.connection.socketMessageEvent = 'video-conference';
            
            this.connection.session = {
                audio: true,
                video: true,
            };

            this.connection.sdpConstraints.mandatory = {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            };

            this.tmp = document.getElementById('videos-container');
            this.connection.videosContainer = document.getElementById('videos-container');



            this.connection.onstream = function (event) {
                event.mediaElement.removeAttribute('src');
                event.mediaElement.removeAttribute('srcObject');
                // streams.push(event.stream)


                //地图上会有默认的视频元素
                var video = document.createElement('video');
                video.controls = true;
                console.log(event.type);
                if (event.type === 'local') {
                    video.muted = true;
                }
                video.srcObject = event.stream;

                var ele = document.getElementById('videos-container');
                var width = parseInt(ele.clientWidth / 2) - 20;
                //获取uerid
                try {
                    var mediaElement = getHTMLMediaElement(video, {
                        title: event.userid,
                        buttons: ['full-screen'],
                        width: width,
                        showOnMouseEnter: false
                    });
                }
                catch (e) {
                    console.log(e);
                }

                ele.appendChild(mediaElement);

                setTimeout(function () {
                    mediaElement.media.play();
                }, 2000);

                mediaElement.id = event.streamid;
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

            // var instance = this;
            // //录音通讯初始化
            // var onFail = function (e) {
            //     console.log('Rejected!', e);
            // };

            // var onSuccess = function (s) {
            //     var context = new (window.AudioContext || window.webkitAudioContext)();
            //     var mediaStreamSource = context.createMediaStreamSource(s);

            //     instance.rec = new Recorder(mediaStreamSource);
            //     instance.rec.record();

            //     // audio loopback
            //     // mediaStreamSource.connect(context.destination);
            // }

            //window.URL = URL || window.URL || window.webkitURL;
            // navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;


            // this.audio = document.getElementById("audio");

            // function startRecording() {
            //     if (navigator.getUserMedia) {
            //         navigator.getUserMedia({ audio: true }, onSuccess, onFail);
            //     } else {
            //         console.log('navigator.getUserMedia not present');
            //     }
            // }
            // startRecording();


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
            //注册
            this.connection.login(localUserId, isTeamMember, function () {

                //获取用户信息
                setTimeout(function () {
                    connection.socket.emit('get-userlist', connection.userid);
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
                instance.connection.socket.on('receive-message-group', function (groupId, message) {
                    console.log("=========接收到群消息========" + groupId + "+++++++++++" + message)
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
        openRoom: function (remotenames) {

            console.log(remotenames);
            this.connection.open(this.localUserid);
            this.connection.notify(remotenames, this.localUserid);
        },
        oldSendMessage: function (value) {
            this.connection.send(value);
        },
        onMessage: function (event) {
            console.log("message got ->" + event.data);

        },
        sendFile: function (file) {
            this.connection.send(file);
        },
        fake_click: function (obj) {
            var ev = document.createEvent('MouseEvents');
            ev.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            obj.dispatchEvent(ev);
        },

        sendImg: function (event, remoteUserid) {
            /**
             * 先判断浏览器是否支持FileReader
             */
            var instance = this;
            if (typeof FileReader === 'undefined') {
                alert('您的浏览器不支持，该更新了');
                //使用bootstrap的样式禁用Button
                document.getElementById("imgButton").attr('disabled', 'disabled');
            } else {
                let file = event.target.files[0]; //先得到选中的文件
                //判断文件是否是图片
                if (!/image\/\w+/.test(file.type)) { //如果不是图片
                    alert("请选择图片");
                    return false;
                }
                /**
                 * 然后使用FileReader读取文件
                 */
                let reader = new FileReader();
                reader.readAsDataURL(file);
                /**
                 * 读取完自动触发onload函数,我们触发sendImg事件给服务器
                 */
                reader.onload = function (e) {
                    instance.connection.socket.emit('sendImg', this.result, remoteUserid, instance.localUserid);
                }
            }

        },
        //发送录音消息
        sendAudio: function (message, remoteUser, callback) {
            var instance = this;
            instance.connection.socket.emit('send-audio', message, remoteUser, instance.localUserid);
        },
        /********************************************************* */
        //单人发送文本消息
        sendMessage: function (message, remoteUser, callback) {
            var instance = this;
            instance.connection.socket.emit('send-message-person', message, remoteUser, instance.connection.userid);
        },
        //用户加入群
        joinGroup: function (groupId) {
            var instance = this;
            instance.connection.socket.emit('join-group', groupId, instance.localUserid)
        },
        //在群里发送文本消息
        sendMessageGroup: function (groupId, message, sender, type) {
            var instance = this;
            instance.connection.socket.emit('send-message-group', groupId, message, sender, type);
        },
        //用户创建群
        createGroup: function (groupId, userIds) {
            var instance = this;
            instance.connection.socket.emit('create-group', groupId, instance.localUserid, userIds);
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
        getPublicModerators:function(){
            this.connection.getPublicModerators(function(moderators){
                return moderators
            })
        }
    }

}
