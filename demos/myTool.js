'use strict';


function myTool() {
    return {
        connection: null,
        localUserid: null,
        video: null,
        tmp: null,
        // streams:[],
        toolInit: function () {

            this.connection = new RTCMultiConnection();
            this.connection.socketURL = '/';
            // this.connection.socketURL = 'https://58.56.100.10:9001/';
            // this.connection.attachStreams = {};

            // comment-out below line if you do not have your  own socket.io server
            // connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

            this.connection.socketMessageEvent = 'audio-video-file-chat-demo';

            this.connection.enableFileSharing = true; // by default, it is "false".

            this.connection.session = {
                audio: true,
                video: true,
                data: true
            };


            this.connection.sdpConstraints.mandatory = {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            };


           
            this.connection.onstream = function (event) {
                event.mediaElement.removeAttribute('src');
                event.mediaElement.removeAttribute('srcObject');
                console.log("=============="+event.type )
				// streams.push(event.stream)

				// 地图上会有默认的视频元
				var video;

				if (event.type === 'local') {
					video = document.getElementById('barrage');
					video.muted = true;
					video.srcObject = event.stream
				} else {
                    video = document.getElementById('videos-container');
					// video.muted = true;
					video.srcObject = event.stream
				}
			
				setTimeout(function() {
					video.play();
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
            // var  mData=JSON.stringify(data);
            this.connection.login(localUserId, isTeamMember, function () {
              
                   instance.connection.socket.on('return-userlist', function (responseCode, data) {
                    console.log("er");

                });
            });
        },
        openRoom: function (remotename) {


            console.log(remotename);
           
           
                this.connection.open(this.localUserid);
            
            this.connection.notify(remotename, this.localUserid);


        },
        sendMessage: function (value) {
            this.connection.send(value);
        },
        onMessage: function (event) {
            console.log("message got ->" + event.data);
            
        },
        sendFile: function (file) {
            this.connection.send(file);
        }

    }

}


