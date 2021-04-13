var a = Math.round(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime())
console.log(new Date(a).toDateString())

var b = Math.round(new Date(1617611347).getTime())
console.log(new Date(1617611347).toDateString())

var c = Math.round(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000)
console.log(new Date(c).toString())

var d = Math.round(new Date(new Date().getFullYear(), 12, 0).getTime() / 1000)
console.log(new Date(d).toString())