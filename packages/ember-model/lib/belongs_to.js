var get = Ember.get,
    set = Ember.set;

function getType(record) {
  if (typeof this.type === "string") {
    this.type =  Ember.get(Ember.lookup, this.type) || record.container.lookupFactory('model:' + this.type);
  }
  return this.type;
}

Ember.belongsTo = function(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'belongsTo', getType: getType },
      relationshipKey = options.key;

  return Ember.computed(function(key, value, oldValue) {
    type = meta.getType(this);
    Ember.assert("Type cannot be empty.", !Ember.isEmpty(type));

    var dirtyAttributes = get(this, '_dirtyAttributes'),
        createdDirtyAttributes = false,
        self = this;

    var dirtyChanged = function(sender) {
      if (sender.get('isDirty')) {
        self._relationshipBecameDirty(relationshipKey);
      } else {
        self._relationshipBecameClean(relationshipKey);
      }
    };

    if (!dirtyAttributes) {
      dirtyAttributes = [];
      createdDirtyAttributes = true;
    }

    if (arguments.length > 1) {

      if (value) {
        Ember.assert(Ember.String.fmt('Attempted to set property of type: %@ with a value of type: %@',
                    [value.constructor, type]),
                    value instanceof type);
      }

      if (oldValue !== value) {
        dirtyAttributes.pushObject(key);
      } else {
        dirtyAttributes.removeObject(key);
      }

      if (createdDirtyAttributes) {
        set(this, '_dirtyAttributes', dirtyAttributes);
      }

      if (meta.options.embedded) {
        if (oldValue) {
          oldValue.removeObserver('isDirty', dirtyChanged);
        }
        if (value) {
          value.addObserver('isDirty', dirtyChanged);
        }
      }

      return value === undefined ? null : value;  
    } else {
      value = this.getBelongsTo(relationshipKey, type, meta);
      this._registerBelongsTo(meta);
      if (value !== null && meta.options.embedded) {
        value.get('isDirty'); // getter must be called before adding observer
        value.addObserver('isDirty', dirtyChanged);
      }
      return value;
    }
  }).property('_data').meta(meta);
};

Ember.Model.reopen({
  getBelongsTo: function(key, type, meta) {
    var idOrAttrs = get(this, '_data.' + key),
        record;

    if (Ember.isNone(idOrAttrs)) {
      return null;
    }

    if (meta.options.embedded) {
      var primaryKey = get(type, 'primaryKey'),
        id = idOrAttrs[primaryKey];
      record = type.create({ isLoaded: false, id: id, container: this.container });
      record.load(id, idOrAttrs);
    } else {
      record = type.find(idOrAttrs);
    }

    return record;
  }
});
