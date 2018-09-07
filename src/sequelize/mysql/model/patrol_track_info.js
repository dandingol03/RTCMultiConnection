
module.exports = function(sequelize,DataTypes){
    var trackInfo = sequelize.define('patrol_track_info',{
        id:{
            type:DataTypes.STRING,
            primaryKey:true,
            allowNull:false,
            // autoIncrement: true,
        },
        track:{
            type:DataTypes.TEXT 
        },
        user_id:{
            type:DataTypes.STRING
        },
        start_time :{
            type:DataTypes.STRING
        },
        end_time:{
            type:DataTypes.STRING
        },
        remark:{
            type:DataTypes.STRING
        }
    },{
        freezeTableName: true,
        timestamps: false,
    });

    
    return trackInfo;
};