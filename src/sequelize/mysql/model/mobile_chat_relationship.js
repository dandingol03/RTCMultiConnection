
module.exports = function(sequelize,DataTypes){
    var RelationShip = sequelize.define('mobile_chat_relationship',{
        id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            allowNull:false,
            autoIncrement: true,
        },
        room_id:{
            type:DataTypes.INTEGER
        },
        user_id:{
            type:DataTypes.STRING
        },
        user_join_date:{
            type:DataTypes.STRING
        },
        type:{
            type:DataTypes.STRING
        }
    },{
        freezeTableName: true,
        timestamps: false,
    });

    
    return RelationShip;
};