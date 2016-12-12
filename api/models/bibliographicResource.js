
// The bibliographicResource model

const mongoose = require('mongoose')
       ,Schema = mongoose.Schema
       ,ObjectId = Schema.ObjectId;

const brSchema = new Schema({
    title: String,
    subTitle: String,
    keywords: [String]
});

module.exports = mongoose.model('br', brSchema);