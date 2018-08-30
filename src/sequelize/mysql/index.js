//初始化Sequelize
var mysqlConfig = require('../../../mysql-config')
var Sequelize = require('sequelize')
var db = {
    sequelize:new Sequelize(
        mysqlConfig.sequelize.database,
        mysqlConfig.sequelize.username,
        mysqlConfig.sequelize.password,
        mysqlConfig.sequelize)
}
db.RoomInfo = db.sequelize.import('./model/mobile-chat-room-info.js')
db.RelationShip=db.sequelize.import('./model/mobile_chat_relationship.js')
db.Content=db.sequelize.import('./model/mobile_chat_content.js')
db.User=db.sequelize.import('./model//pub_users.js')


module.exports = db