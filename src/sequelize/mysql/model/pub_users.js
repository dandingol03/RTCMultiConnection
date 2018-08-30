module.exports = function(sequelize,DataTypes){
    var User = sequelize.define('pub_users',{
        USER_ID:{
            type:DataTypes.STRING,
            primaryKey:true,
            allowNull:false,
        },
        USER_ACCOUNT:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        USER_NAME:{
            type:DataTypes.STRING,
        },
        USER_PASSWORD:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        USER_GENDER:{
            type:DataTypes.STRING,
        },
        USER_BIRTHDAY:{
            type:DataTypes.STRING
        },
        USER_ORG:{
            type:DataTypes.STRING
        },
        USER_DUTY:{
            type:DataTypes.STRING
        },
        USER_TELEPHONE:{
            type:DataTypes.STRING
        },
        MAIL:{
            type:DataTypes.STRING
        },
        QQ_WEIXIN:{
            type:DataTypes.STRING
        },
        USER_DESC:{
            type:DataTypes.STRING
        },
        ENABLE:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        IS_SYS:{
            type:DataTypes.STRING,
            allowNull:false,
        },
        ERR_TIMES:{
            type:DataTypes.STRING
        },
        USER_DEPARTMENT:{
            type:DataTypes.STRING
        },
        LNG:{
            type:DataTypes.STRING
        },
        LAT:{
            type:DataTypes.STRING
        },
        LAST_TIME:{
            type:DataTypes.STRING
        },
        
      
    },{
        freezeTableName: true,
        timestamps: false,
    });

    
    return User;
};