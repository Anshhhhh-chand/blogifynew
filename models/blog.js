const mongoose = require('mongoose');
const {Schema , model} = mongoose;

const blogSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    body: {
        type: String,
        required: true
    },
    coverImageURL: {    
        type: String,
       required: false
    },
    createdBy: {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
},{
    timestamps:true
});

// Generate slug BEFORE validation so the `required` rule passes on create
blogSchema.pre('validate', function(next) {
    // Only generate slug if missing or title changed
    if (!this.slug || this.isModified('title')) {
        const base = (this.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Always append a short timestamp for uniqueness on new docs
        if (this.isNew) {
            const timestamp = Date.now().toString().slice(-6);
            this.slug = base ? `${base}-${timestamp}` : timestamp;
        } else {
            this.slug = base || this.slug;
        }
    }
    next();
});

const Blog= model('blog',blogSchema);
module.exports= Blog
