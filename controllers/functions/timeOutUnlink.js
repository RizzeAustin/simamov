const fs = require('fs');
const _ = require('underscore')
module.exports = (filePath, timeout = 15000)=>{
    const unlink = (singlePath)=>{
        setTimeout(()=>{
            if (fs.existsSync(singlePath)){
                fs.unlink(singlePath)
            }
        }, timeout)
    }

    if(_.isArray(filePath)){
        _.each(filePath, (item, i, list)=>{
            unlink(item);
        })
    } else{
        unlink(filePath);
    }
}