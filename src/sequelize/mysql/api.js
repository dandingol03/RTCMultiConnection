var mysql = require('./index')
var Q = require('q');
var Sequelize = require('sequelize')
const Op = Sequelize.Op
var RelationShip = require('./model/mobile_chat_relationship')

var Api = {
    //插入房间记录
    insertRoomInfo: (roomName, type, t) => {
        return mysql.RoomInfo.create({ name: roomName, create_date: Api.getTaskTime(new Date().toString()), remark: type }, { transaction: t })
    },
    //插入关系记录
    insertRelation: (room_id, userIds, Type, t) => {
        var creates = []
        for (var i = 0; i < userIds.length; i++)
            creates.push({ room_id: room_id, user_id: userIds[i], user_join_date: Api.getTaskTime(new Date().toString()), type: Type })
        return mysql.RelationShip.bulkCreate(creates, { transaction: t })
    },
    //插入单聊关系记录
    insertSingleRelation: (room_id, userIds, t) => {
        var creates = []
        for (var i = 0; i < userIds.length; i++)
            creates.push({ room_id, user_id: userIds[i], user_join_date: Api.getTaskTime(new Date().toString()), type: "1" })
        return mysql.RelationShip.bulkCreate(creates, { transaction: t })
    },
    //插入消息记录
    insertContent: (room_id, sender_id,sender_name, content, userIds, type,chat_type,send_date, t) => {
        var room_user_ids = ''
        for (var i = 0; i < userIds.length; i++) {
            room_user_ids += userIds[i]
            if (i != userIds.length - 1)
                room_user_ids += ','
        }
        return mysql.Content.create({ room_id, sender_id,sender_name, content, type, room_user_ids,chat_type, send_date }, { transaction: t })
    },
    //删除关系记录
    deleteRelation: (room_id, userIds, t) => {
        return mysql.RelationShip.destroy({
            where:
            {
                room_id: room_id,
                user_id: { [Op.in]: userIds }
            }
        }, {
                transaction: t
            })
    },
    //批量删除关系记录
    deleteRelations: (room_id, t) => {
        return mysql.RelationShip.destroy({ where: { room_id: room_id } }, { transaction: t })
    },
    //删除内容记录
    deleteContent: (room_id, t) => {
        return mysql.Content.destroy({
            where: { room_id: room_id, }
        }, {
                transaction: t
            })
    },
    //删除房间记录
    deleteRoom: (room_id, t) => {
        return mysql.RoomInfo.destroy({
            where: { room_id: room_id, }
        }, {
                transaction: t
            })
    },
    //查询未读消息
    inquireContentUnread: (user_id) => {
        return mysql.Content.findAll({
            where: {
                room_user_ids: {
                    [Op.regexp]: user_id
                }
            }
        })
    },
    //查询单条消息
    inquireSingleContent: (content_id) => {
        return mysql.Content.find({
            where: {
                id: content_id
            }
        })
    },
    //查询房间记录
    inquireRoomInfo: (room_id, ) => {
        return mysql.RoomInfo.find({ where: { id: room_id } })
    },
    //查询用户信息
    inquireUserInfo: (user_id) => {
        return mysql.User.find({ where: { USER_ID: user_id } })
    },
    //查询两人是否通讯过
    isCommunicated: (userIds) => {
        var deferred = Q.defer()
        if (userIds.length != 2) {
            deferred.resolve({ re: -1, data: 'user_id缺少' })
        }
        var first = userIds[0]
        var second = userIds[1]

        //单聊房间的relationShip type为1
        mysql.RelationShip.findAll({ where: { user_id: first, type: 1 } }).then((relations) => {
            if (relations != null && relations.length > 0) {
                function getPromise(room_id) {
                    return mysql.RelationShip.find({ where: { room_id: room_id, user_id: second } })
                }
                let promises = []
                for (var i = 0; i < relations.length; i++) {
                    promises.push(getPromise(relations[i].room_id))
                }
                Q.all(promises).then((result) => {
                    for (var i = 0; i < result.length; i++) {
                        var res = result[i]
                        if (res != null) {
                            deferred.resolve({ re: 1, data: res.room_id })
                            return
                        }
                    }
                    deferred.resolve({ re: -1, data: null })
                })
            } else {
                return deferred.resolve({ re: -1, data: null })
            }
        })

        return deferred.promise
    },
    //查询房间是否有此人
    isUserInRoom: (user_id, room_id) => {
        return mysql.RelationShip.findAll({ where: { user_id: user_id, room_id: room_id } })
    },
    //一对一创建房间
    createRoomWithoutName: (userIds) => {
        var deferred = Q.defer()

        Api.isCommunicated(userIds).then((res) => {
            var communicated = res.re
            //存在对应的房间
            if (res.re == 1) {
                //返回房间信息
                Api.inquireRoomInfo(res.data).then((room) => {
                    deferred.resolve({ re: 1, data: room })
                })
            } else {
                //开启事务
                mysql.sequelize.transaction().then((t) => {
                    var first = userIds[0]
                    var second = userIds[1]
                    var roomInfo = null
                    Api.insertRoomInfo(`${first}_${second}`, "1", t).then((room) => {
                        roomInfo = room
                        return Api.insertSingleRelation(room.id, [first, second], t)
                    }).then((res) => {
                        t.commit()
                        deferred.resolve({ re: 1, data: roomInfo })
                    }).catch((e) => {
                        t.rollback()//回滚
                        deferred.reject({ re: -1, data: e })
                    })
                })
            }
        })

        return deferred.promise

    },
    //群聊创建房间
    createRoom: (name, userIds, type) => {
        var deferred = Q.defer()
        var roomData = {};
                //开启事务
                mysql.sequelize.transaction().then((t) => {
                    //创建群聊房间时 remark为2 edit by wqz
                    mysql.RoomInfo.create({ name: name, create_date: Api.getTaskTime(new Date().toString()), remark: "2" }, { transaction: t })
                        .then((room) => {
                            //加入关系时  关系表中群聊type=2
                            roomData = room;
                            return Api.insertRelation(room.id, userIds, "2", t)
                           
                        }).then(() => {
                            t.commit()
                            deferred.resolve({ re: 1,data:  {room_id:roomData.id,room_name:roomData.name}   })
                        }).catch((e) => {
                            t.rollback()
                            deferred.reject({ re: -1, data: '创建房间失败' })
                        })
                })
        return deferred.promise
    },
    //用户离开房间,仅供群聊房间
    leaveRoom: (user_id, roomName) => {

        var deferred = Q.defer()
        Api.getRoomInfo(roomName).then((room) => {

            return Api.deleteRelation(room.id, [user_id], null)
        }).then((res) => {
            deferred.resolve(res)
        })
        return deferred.promise
    },
    //解散房间
    dismissRoom: (roomName, user_id) => {
        var deferred = Q.defer()
        mysql.RoomInfo.find({ where: { name: roomName } }).then((room) => {
            if (room != null) {
                mysql.sequelize.transaction((t) => {
                    Api.deleteContent(room.id, t).then((res) => {
                        return Api.deleteRelations(room.id, t)
                    }).then((res) => {
                        return Api.deleteRoom(room.id, t)
                    }).then((res) => {
                        t.commit()
                        deferred.resolve({ re: 1 })
                    })
                        .catch((e) => {
                            t.rollback()
                            deferred.reject({ re: -1, data: e })
                        })
                })
            } else {
                deferred.resolve({ re: 2 })
            }
        })
        return deferred.promise
    },
    //根据房间名查询房间信息
    getRoomInfo: (roomName) => {
        return mysql.RoomInfo.find({ where: { name: roomName } })
    },
    //获取所有房间
    getRooms: () => {
        return mysql.RoomInfo.findAll()
    },
    //获取所有群聊房间
    getGroupChatRooms: (user_id) => {
        var deferred = Q.defer()

        mysql.RelationShip.findAll({
            attributes: [
                [Sequelize.fn('COUNT', '*'), 'userCount'],
                'room_id'
            ],
            group: ['room_id']
        }).then((statics) => {
            var arr = []
            for (var i = 0; i < statics.length; i++) {
                var record = statics[i].get({ plain: true })
                if (record.userCount > 2) {
                    arr.push(record)
                }
            }

            //todo:查询是否含有user_id
            let promises = []
            function getPromise(room_id) {
                return mysql.RelationShip.find({ where: { room_id: room_id, user_id: user_id } })
            }
            function getRoomPromise(room_id) {
                return mysql.RoomInfo.find({ where: { id: room_id } })
            }


            for (var i = 0; i < arr.length; i++) {
                promises.push(getPromise(arr[i].room_id))
            }
            var matched = []
            Q.all(promises).then((result) => {
                for (var i = 0; i < result.length; i++) {
                    var res = result[i]
                    if (res != null) {
                        matched.push(res.room_id)
                    }
                }
                if (matched.length > 0) {
                    promises = []
                    for (var j = 0; j < matched.length; j++) {
                        promises.push(getRoomPromise(matched[j]))
                    }
                    
                    Q.all(promises).then((rooms)=>{
                        var matchedRooms=[]
                        for(var k=0;k<rooms.length;k++)
                        {
                            if(rooms[k]!=null)
                                matchedRooms.push(rooms[k].get({plain:true}))
                        }
                        deferred.resolve({ re: 1, data: matchedRooms })
                    }).catch((e) => {
                        console.error(e)
                        deferred.reject({ re: -1, data: null })
                    })
                } else {
                    deferred.resolve({ re: 2, data: null })
                }

            })
        })


        return deferred.promise
    },
    //获取房间成员
    getRoomMember: (roomName) => {
        var deferred = Q.defer()
        Api.getRoomInfo(roomName).then((room) => {
            return mysql.RelationShip.findAll({ where: { room_id: room.id } })
        }).then((users) => {
            var promises = []
            function getUserPromise(user) {
                var defer = Q.defer()
                Api.inquireUserInfo(user.user_id).then((info) => {
                    if (info != null) {
                        user.name = info.USER_NAME
                    }
                    defer.resolve(user)
                })
                return defer.promise
            }

            for (var j = 0; j < users.length; j++) {
                var userEntity = users[j].get({ plain: true })
                promises.push(getUserPromise(userEntity))
            }

            Q.all(promises).then((result) => {
                deferred.resolve({ re: 1, data: result })
            })

        })
        return deferred.promise
    },
    //发送组消息和发送一对一消息都用此接口
    sendGroupMessage: (room_id, sender_id,sender_name, content, userIds, type,chatType,date) => {
        var deferred = Q.defer()
        mysql.sequelize.transaction().then((t) => {
            Api.insertContent(room_id, sender_id, sender_name,content, userIds, type,chatType,date, t).then((res) => {
                deferred.resolve({ re: 1 })
                t.commit()
            }).catch((e) => {
                t.rollback()
                deferred.reject({ re: -1, data: e })
            })
        })
        return deferred.promise

    },
    //加入群聊 type=2
    joinGroup: (room_id, user_id) => {
        var deferred = Q.defer()
        var type = 2;
        mysql.sequelize.transaction().then((t) => {
            Api.insertRelation(room_id, [user_id], type, t).then((res) => {
                t.commit()
                deferred.resolve({ re: 1 })
            }).catch((e) => {
                t.rollback()
                deferred.reject({ re: -1, data: e })
            })
        })
        return deferred.promise
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
    //查询user_id的未读信息
    fetchMessegeUnread: (user_id) => {
        var deferred = Q.defer()
        Api.inquireContentUnread(user_id).then((contents) => {

            var promises = []
            function getRoomPromise(content) {
                var defer = Q.defer()
                mysql.RoomInfo.find({ where: { id: content.room_id } }).then((room) => {
                    content.roomName = room.name
                    content.roomType = room.remark
                    defer.resolve(content)
                })
                return defer.promise
            }

            for (var j = 0; j < contents.length; j++) {
                promises.push(getRoomPromise(contents[j].get({plain:true})))
            }
            Q.all(promises).then((result) => {

                deferred.resolve({ re: 1, data: result })
            })
        })
        return deferred.promise
    },
    //删除未读信息
    deleteUnreadContent: (content_id, user_id) => {
        var deferred = Q.defer()
        Api.inquireSingleContent(content_id).then((content) => {
            if (content != null) {
                var userIds = content.room_user_ids.split(',')
                userIds.splice(userIds.indexOf(user_id), 1)
                var str = ''
                for (var i = 0; i < userIds.length; i++) {
                    str += userIds[i]
                    if (i != userIds.length - 1)
                        str += ','
                }
                //删除内容记录本身
                if (str == '') {
                    content.destroy().then(() => {
                        deferred.resolve({ re: 1 })
                    })
                } else {
                    content.room_user_ids = str
                    content.save().then(() => {
                        deferred.resolve({ re: 1 })
                    })
                }
            } else {
                deferred.resolve({ re: 2, data: null })
            }
        })
        return deferred.promise
    },
    fetchUserInfo: (user_id) => {
        var deferred = Q.defer()
        Api.inquireUserInfo(user_id).then((user) => {
            deferred.resolve({ re: 1, data: user })
        })
        return deferred.promise
    }
}





module.exports = Api