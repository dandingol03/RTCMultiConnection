var db=require('../index')

module.exports = function(sequelize,DataTypes){
    var RoomInfo = sequelize.define('mobile_chat_room_info',{
        id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            allowNull:false,
            autoIncrement: true,
        },
        name:{
            type:DataTypes.STRING
        },
        create_date:{
            type:DataTypes.STRING
        },
        remark:{
            type:DataTypes.STRING
        }
    },{
        freezeTableName: true,
        timestamps: false,
    });

    return RoomInfo;
};