module.exports = function(sequelize,DataTypes){
    var Content = sequelize.define('mobile_chat_content',{
        id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            allowNull:false,
            autoIncrement: true,
        },
        sender_id:{
            type:DataTypes.STRING
        },
        sender_name:{
            type:DataTypes.STRING
        },
        room_id:{
            type:DataTypes.INTEGER
        },
        send_date:{
            type:DataTypes.STRING
        },
        content:{
            type:DataTypes.TEXT  
        },
        room_user_ids:{
            type:DataTypes.TEXT
        },
        type:{
            type:DataTypes.STRING
        },
        chat_type:{
            type:DataTypes.STRING
        }
    },{
        freezeTableName: true,
        timestamps: false,
    });

    
    return Content;
};