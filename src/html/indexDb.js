'use strict';


function IndexDB() {
    return {
         instance :{
            myDB:{
                name:'sdrpoms',
                version:1,
                db:null,
                ojstore:{
                    name:'content',//存储空间表的名字
                    keypath:'id'//主键
                }
            },
            indexedDB:window.indexedDB||window.webkitindexedDB,
            IDBKeyRange:window.IDBKeyRange || window.webkitIDBKeyRange,//键范围
            openDB:function(dbname,dbversion,callback){
                //建立或打开数据库，建立对象存储空间(ObjectStore)
                var self = this;
                var version = dbversion || 1;
                var request = self.indexedDB.open(dbname,version);
                request.onerror = function(e){
                    console.log(e.currentTarget.error.message);
                };
                request.onsuccess = function(e){
                    self.myDB.db = e.target.result;
                    console.log('成功建立并打开数据库:'+self.myDB.name+' version'+dbversion);
                };
                request.onupgradeneeded=function(e){
                    var db=e.target.result,transaction= e.target.transaction,store;
                    if(!db.objectStoreNames.contains(self.myDB.ojstore.name)){
                        //没有该对象空间时创建该对象空间
                        store = db.createObjectStore(self.myDB.ojstore.name,{keyPath:self.myDB.ojstore.keypath});
                        console.log('成功建立对象存储空间：'+self.myDB.ojstore.name);
                    }
                }
    
    
            },
            deletedb:function(dbname){
                //删除数据库
                var self = this;
                self.indexedDB.deleteDatabase(dbname);
                console.log(dbname+'数据库已删除')
            },
            closeDB:function(db){
                //关闭数据库
                db.close();
                console.log('数据库已关闭')
            },
            addData:function(db,storename,data){
                //添加数据，重复添加会报错
                var store = store = db.transaction(storename,'readwrite').objectStore(storename),request;
                for(var i = 0 ; i < data.length;i++){
                    request = store.add(data[i]);
                    request.onerror = function(){
                        console.error('add添加数据库中已有该数据')
                    };
                    request.onsuccess = function(){
                        console.log('add添加数据已存入数据库')
                    };
                }
                
            },
            putData:function(db,storename,data){
                //添加数据，重复添加会更新原有数据
                var store = store = db.transaction(storename,'readwrite').objectStore(storename),request;
                for(var i = 0 ; i < data.length;i++){
                    request = store.put(data[i]);
                    request.onerror = function(){
                        console.error('put添加数据库中已有该数据')
                    };
                    request.onsuccess = function(){
                        console.log('put添加数据已存入数据库')
                    };
                }
            },
            getDataByKey:function(db,storename,key){
                //根据存储空间的键找到对应数据
                var store = db.transaction(storename,'readwrite').objectStore(storename);
                var request = store.get(key);
                request.onerror = function(){
                    console.error('getDataByKey error');
                };
                request.onsuccess = function(e){
                    var result = e.target.result;
                    console.log('查找数据成功')
                    console.log(result);
                };
            },
            query:function(storename){
                var self=this
                var store = self.myDB.db.transaction(storename,'readwrite').objectStore(storename);
                var request = store.openCursor();//db为IDBDatabase对象
                request.onerror = function(e){
                }
                request.onsuccess = function(e){
                    console.log('游标开始查询')
                    var cursor = e.target.result;
                    if(cursor){//必须要检查
                        console.log(cursor);
                        cursor.continue();//遍历了存储对象中的所有内容
                    }else{
                    }
                };
            },
            deleteData:function(db,storename,key){
                //删除某一条记录
                var store = store = db.transaction(storename,'readwrite').objectStore(storename);
                store.delete(key)
                console.log('已删除存储空间'+storename+'中'+key+'记录');
            },
            clearData:function(db,storename){
                //删除存储空间全部记录
                var store = db.transaction(storename,'readwrite').objectStore(storename);
                store.clear();
                console.log('已删除存储空间'+storename+'全部记录');
            }
        }
    


    }
}