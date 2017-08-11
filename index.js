(function() {
  var PouchDB, crypto, debug, delay, pkg, replicate, seem, url,
    hasProp = {}.hasOwnProperty;

  seem = require('seem');

  module.exports = replicate = seem(function*(prefix_source, prefix_target, name, extensions_cb) {
    var _rev, auth, comment, doc, id, k, model, replicator, replicator_db, source, sum, target, use_delete, v;
    replicator_db = prefix_target + "/_replicator";
    replicator = new PouchDB(replicator_db, {
      skip_setup: true
    });
    use_delete = true;
    source = url.parse(prefix_source);
    comment = "replication of " + name + " from " + source.host;
    debug("Going to start " + comment + ".");
    model = {
      comment: comment,
      continuous: true,
      target: name,
      source: {
        url: url.format({
          protocol: source.protocol,
          host: source.host,
          pathname: name
        })
      }
    };
    if (source.auth != null) {
      auth = (new Buffer(source.auth)).toString('base64');
      debug("Encoded `" + source.auth + "` of `" + prefix_source + "` as `" + auth + "`.");
      model.source.headers = {
        Authorization: "Basic " + auth
      };
    }
    yield (typeof extensions_cb === "function" ? extensions_cb(model) : void 0);
    sum = crypto.createHash('sha256');
    sum.update(JSON.stringify(model));
    id = sum.digest('hex');
    model.comment_id = id;
    model._id = use_delete ? model.comment : id;
    debug("Going to inject", model);
    target = new PouchDB(prefix_target + "/" + name, {
      skip_setup: false
    });
    yield target.info();
    if (use_delete) {
      _rev = (yield replicator.get(model._id)["catch"](function(error) {
        return {};
      }))._rev;
      if (_rev != null) {
        yield replicator.remove(model._id, _rev);
      }
    }
    yield delay(2000);
    _rev = (yield replicator.get(model._id)["catch"](function(error) {
      return {};
    }))._rev;
    doc = {};
    if (_rev != null) {
      doc._rev = _rev;
    }
    for (k in model) {
      if (!hasProp.call(model, k)) continue;
      v = model[k];
      doc[k] = v;
    }
    debug('Creating replication', doc);
    yield replicator.put(doc)["catch"](function(error) {
      var ref;
      debug("put " + model._id + ": " + ((ref = error.stack) != null ? ref : error));
      if ((error.status != null) && error.status === 403) {
        debug("Replication already started");
        return;
      }
      debug("Replication from " + model.source + " failed.");
      return Promise.reject(error);
    });
    yield delay(2000);
    doc = (yield replicator.get(model._id)["catch"](function(error) {
      return {};
    }));
    return debug('Replication status', doc);
  });

  PouchDB = require('pouchdb-core').plugin(require('pouchdb-adapter-http')).plugin(require('pouchdb-replication'));

  delay = require('timeout-as-promise');

  crypto = require('crypto');

  url = require('url');

  pkg = require('./package.json');

  debug = (require('tangible'))(pkg.name);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5jb2ZmZWUubWQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0k7QUFBQSxNQUFBLHdEQUFBO0lBQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQU1QLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUEsR0FBWSxJQUFBLENBQUssVUFBQyxhQUFELEVBQWUsYUFBZixFQUE2QixJQUE3QixFQUFrQyxhQUFsQztBQUVoQyxRQUFBO0lBQUEsYUFBQSxHQUFtQixhQUFELEdBQWU7SUFDakMsVUFBQSxHQUFhLElBQUksT0FBSixDQUFZLGFBQVosRUFBMkI7TUFBQSxVQUFBLEVBQVksSUFBWjtLQUEzQjtJQUtiLFVBQUEsR0FBYTtJQVNiLE1BQUEsR0FBUyxHQUFHLENBQUMsS0FBSixDQUFVLGFBQVY7SUFDVCxPQUFBLEdBQVUsaUJBQUEsR0FBa0IsSUFBbEIsR0FBdUIsUUFBdkIsR0FBK0IsTUFBTSxDQUFDO0lBQ2hELEtBQUEsQ0FBTSxpQkFBQSxHQUFrQixPQUFsQixHQUEwQixHQUFoQztJQUlBLEtBQUEsR0FDRTtNQUFBLE9BQUEsRUFBUyxPQUFUO01BQ0EsVUFBQSxFQUFZLElBRFo7TUFFQSxNQUFBLEVBQVEsSUFGUjtNQU1BLE1BQUEsRUFDRTtRQUFBLEdBQUEsRUFBSyxHQUFHLENBQUMsTUFBSixDQUNIO1VBQUEsUUFBQSxFQUFVLE1BQU0sQ0FBQyxRQUFqQjtVQUNBLElBQUEsRUFBTSxNQUFNLENBQUMsSUFEYjtVQUVBLFFBQUEsRUFBVSxJQUZWO1NBREcsQ0FBTDtPQVBGOztJQWNGLElBQUcsbUJBQUg7TUFDRSxJQUFBLEdBQU8sQ0FBQyxJQUFJLE1BQUosQ0FBVyxNQUFNLENBQUMsSUFBbEIsQ0FBRCxDQUF3QixDQUFDLFFBQXpCLENBQWtDLFFBQWxDO01BQ1AsS0FBQSxDQUFNLFdBQUEsR0FBWSxNQUFNLENBQUMsSUFBbkIsR0FBd0IsUUFBeEIsR0FBZ0MsYUFB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QSxDQUFxQixHQUFHLENBQUMsSUFBekI7QUE3SVIiLCJzb3VyY2VzQ29udGVudCI6WyJgcmVwbGljYXRlYFxuLS0tLS0tLS0tLS1cblxuICAgIHNlZW0gPSByZXF1aXJlICdzZWVtJ1xuXG5gcmVwbGljYXRlKHNvdXJjZSx0YXJnZXQsbmFtZSxleHRlbnNpb25zKWA6IHJlcGxpY2F0ZSBkYXRhYmFzZSBgbmFtZWAgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YCAoYWxsIHN0cmluZ3MpIGJ5IGNyZWF0aW5nIGEgcmVwbGljYXRpb24gYHB1bGxgIGRvY3VtZW50IG9uIHRoZSB0YXJnZXQuXG5CZWZvcmUgc3VibWlzc2lvbiwgdGhlIHJlcGxpY2F0aW9uIGRvY3VtZW50IGlzIHBhc3NlZCB0byB0aGUgKG9wdGlvbmFsKSBgZXh0ZW5zaW9uc2AgY2FsbGJhY2suXG5SZXR1cm5zIGEgUHJvbWlzZS4gTWFrZSBzdXJlIHlvdSBgY2F0Y2goKWAgYW55IGVycm9ycy5cblxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVwbGljYXRlID0gc2VlbSAocHJlZml4X3NvdXJjZSxwcmVmaXhfdGFyZ2V0LG5hbWUsZXh0ZW5zaW9uc19jYikgLT5cblxuICAgICAgcmVwbGljYXRvcl9kYiA9IFwiI3twcmVmaXhfdGFyZ2V0fS9fcmVwbGljYXRvclwiXG4gICAgICByZXBsaWNhdG9yID0gbmV3IFBvdWNoREIgcmVwbGljYXRvcl9kYiwgc2tpcF9zZXR1cDogdHJ1ZVxuXG5IZXJlIHdlIGhhdmUgbXVsdGlwbGUgc29sdXRpb25zLCBzbyBJJ2xsIHRlc3QgdGhlbTpcbi0gZWl0aGVyIGRlbGV0ZSBhbnkgZXhpc3RpbmcgZG9jdW1lbnQgd2l0aCB0aGUgc2FtZSBuYW1lICh0aGlzIHNob3VsZCBjYW5jZWwgdGhlIHJlcGxpY2F0aW9uLCBiYXNlZCBvbiB0aGUgQ291Y2hEQiBkb2NzKSwgYW5kIHJlY3JlYXRlIGEgbmV3IG9uZTtcblxuICAgICAgdXNlX2RlbGV0ZSA9IHRydWVcblxuLSBvciB1c2UgYSBkaWZmZXJlbnQgSUQgZm9yIGRvY3VtZW50cyB0aGF0IGRlc2NyaWJlcyBkaWZmZXJlbnQgcmVwbGljYXRpb25zLlxuXG4gICAgICAjIHVzZV9kZWxldGUgPSBmYWxzZVxuXG5UaGUgb25lIHRoaW5nIHdlIGtub3cgZG9lc24ndCB3b3JrIGlzIHVzaW5nIHRoZSBzYW1lIGRvY3VtZW50IElEIGZvciBkb2N1bWVudHMgdGhhdCBkZXNjcmliZSBkaWZmZXJlbnQgcmVwbGljYXRpb25zIChlLmcuIHdpdGggZGlmZmVyZW50IGZpbHRlcnM6IGV4cGVyaWVuY2Ugc2hvd3MgdGhlIHJlcGxpY2F0b3IgZG9lc24ndCBub3RpY2UgYW5kIGtlZXBzIHVzaW5nIHRoZSBvbGQgZmlsdGVyKS5cbkRlbGV0aW5nIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudCBzaG91bGQgYWxzbyBmb3JjZSB0aGUgcmVwbGljYXRvciB0byBzdG9wIHRoZSBleGlzdGluZyByZXBsaWNhdGlvbiBhbmQgc3RhcnQgYSBuZXcgcHJvY2Vzcy5cblxuICAgICAgc291cmNlID0gdXJsLnBhcnNlIHByZWZpeF9zb3VyY2VcbiAgICAgIGNvbW1lbnQgPSBcInJlcGxpY2F0aW9uIG9mICN7bmFtZX0gZnJvbSAje3NvdXJjZS5ob3N0fVwiXG4gICAgICBkZWJ1ZyBcIkdvaW5nIHRvIHN0YXJ0ICN7Y29tbWVudH0uXCJcblxuSSdtIGNyZWF0aW5nIGEgYG1vZGVsYCBkb2N1bWVudC4uIGp1c3QgaW4gY2FzZSBJJ2QgaGF2ZSB0byByZXZlcnQgdG8gbWFudWFsbHkgcHVzaGluZyB0byBgL19yZXBsaWNhdGVgIGJlY2F1c2UgdGhlIHJlcGxpY2F0b3IgaXMgdG9vIGJyb2tlbi4gOilcblxuICAgICAgbW9kZWwgPVxuICAgICAgICBjb21tZW50OiBjb21tZW50XG4gICAgICAgIGNvbnRpbnVvdXM6IHRydWVcbiAgICAgICAgdGFyZ2V0OiBuYW1lXG5cblJlbW92ZSBhdXRob3JpemF0aW9uIGZyb20gdGhlIHNvdXJjZSwgYmVjYXVzZS4uLlxuXG4gICAgICAgIHNvdXJjZTpcbiAgICAgICAgICB1cmw6IHVybC5mb3JtYXRcbiAgICAgICAgICAgIHByb3RvY29sOiBzb3VyY2UucHJvdG9jb2xcbiAgICAgICAgICAgIGhvc3Q6IHNvdXJjZS5ob3N0XG4gICAgICAgICAgICBwYXRobmFtZTogbmFtZVxuXG4uLi5ldmVuIHdpdGggQ291Y2hEQiAxLjYuMSB3ZSBzdGlsbCBoYXZlIHRoZSBpc3N1ZSB3aXRoIENvdWNoREIgbm90IHByb3Blcmx5IG1hbmFnaW5nIGF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGEgdXNlcm5hbWUgYW5kIHBhc3N3b3JkIGFyZSBwcm92aWRlZCBpbiB0aGUgb3JpZ2luYWwgVVJJIHRoYXQgY29udGFpbnMgXCJzcGVjaWFsXCIgY2hhcmFjdGVycyAobGlrZSBgQGAgb3Igc3BhY2UpLiBTbyBsZXQncyBoYW5kbGUgaXQgb3Vyc2VsdmVzLlxuXG4gICAgICBpZiBzb3VyY2UuYXV0aD9cbiAgICAgICAgYXV0aCA9IChuZXcgQnVmZmVyIHNvdXJjZS5hdXRoKS50b1N0cmluZyAnYmFzZTY0J1xuICAgICAgICBkZWJ1ZyBcIkVuY29kZWQgYCN7c291cmNlLmF1dGh9YCBvZiBgI3twcmVmaXhfc291cmNlfWAgYXMgYCN7YXV0aH1gLlwiXG4gICAgICAgIG1vZGVsLnNvdXJjZS5oZWFkZXJzID1cbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBcIkJhc2ljICN7YXV0aH1cIlxuXG5MZXQgdGhlIGNhbGxiYWNrIGFkZCBhbnkgZmllbGQgdGhleSdkIGxpa2UuXG5Ob3RlOiB0aGUgY2FsbGJhY2sgbWlnaHQgYWxzbyBwcmV2ZW50IHJlcGxpY2F0aW9uIGlmIGl0IHRocm93cy4gVGhpcyBpcyBpbnRlbnRpb25hbC5cbk5vdGU6IHRoZSBjYWxsYmFjayBtaWdodCByZXR1cm4gYSBQcm9taXNlLiBPciBub3QuIFdlJ2xsIGRlYWwgd2l0aCBib3RoLlxuXG4gICAgICB5aWVsZCBleHRlbnNpb25zX2NiPyBtb2RlbFxuXG5DcmVhdGUgYSAoc29tZXdoYXQpIHVuaXF1ZSBJRCBmb3IgdGhlIGRvY3VtZW50LlxuXG4gICAgICBzdW0gPSBjcnlwdG8uY3JlYXRlSGFzaCAnc2hhMjU2J1xuICAgICAgc3VtLnVwZGF0ZSBKU09OLnN0cmluZ2lmeSBtb2RlbFxuICAgICAgaWQgPSBzdW0uZGlnZXN0ICdoZXgnXG4gICAgICBtb2RlbC5jb21tZW50X2lkID0gaWRcblxuV2hlbiBkZWxldGluZywgd2UgY2FuIHVzZSB0aGUgYGNvbW1lbnRgIHZhbHVlIHNpbmNlIGl0IGRvZXNuJ3QgaGF2ZSB0byBiZSB1bmlxdWUgZXZlbiBpZiB3ZSBjaGFuZ2UgdGhlIHJlY29yZC5cbldoZW4gY3JlYXRpbmcgZG9jdW1lbnRzIHdpdGggZGlmZmVyZW50IElEcywgd2VsbCwgdXNlIHRoZSBjb21wdXRlZCBJRC5cblxuICAgICAgbW9kZWwuX2lkID0gaWYgdXNlX2RlbGV0ZSB0aGVuIG1vZGVsLmNvbW1lbnQgZWxzZSBpZFxuXG5MZXQncyBnZXQgc3RhcnRlZC5cblxuICAgICAgZGVidWcgXCJHb2luZyB0byBpbmplY3RcIiwgbW9kZWxcblxuQ3JlYXRlIHRoZSB0YXJnZXQgZGF0YWJhc2UgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0LlxuXG4gICAgICB0YXJnZXQgPSBuZXcgUG91Y2hEQiBcIiN7cHJlZml4X3RhcmdldH0vI3tuYW1lfVwiLCBza2lwX3NldHVwOiBmYWxzZVxuICAgICAgeWllbGQgdGFyZ2V0LmluZm8oKVxuXG5XaGVuIHVzaW5nIHRoZSBkZWxldGlvbiBtZXRob2QsIGZpcnN0IGRlbGV0ZSB0aGUgZXhpc3RpbmcgcmVwbGljYXRpb24gZG9jdW1lbnQuXG5cbiAgICAgIGlmIHVzZV9kZWxldGVcbiAgICAgICAge19yZXZ9ID0geWllbGQgcmVwbGljYXRvclxuICAgICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cbiAgICAgICAgeWllbGQgcmVwbGljYXRvci5yZW1vdmUgbW9kZWwuX2lkLCBfcmV2IGlmIF9yZXY/XG5cbkdpdmUgQ291Y2hEQiBzb21lIHRpbWUgdG8gYnJlYXRoLlxuXG4gICAgICB5aWVsZCBkZWxheSAyMDAwXG5cblVwZGF0ZSB0aGUgcmVwbGljYXRpb24gZG9jdW1lbnQuXG5cbiAgICAgIHtfcmV2fSA9IHlpZWxkIHJlcGxpY2F0b3JcbiAgICAgICAgLmdldCBtb2RlbC5faWRcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cblxuICAgICAgZG9jID0ge31cbiAgICAgIGRvYy5fcmV2ID0gX3JldiBpZiBfcmV2P1xuICAgICAgZm9yIG93biBrLHYgb2YgbW9kZWxcbiAgICAgICAgZG9jW2tdID0gdlxuXG4gICAgICBkZWJ1ZyAnQ3JlYXRpbmcgcmVwbGljYXRpb24nLCBkb2NcblxuICAgICAgeWllbGQgcmVwbGljYXRvclxuICAgICAgICAucHV0IGRvY1xuICAgICAgICAuY2F0Y2ggKGVycm9yKSAtPlxuICAgICAgICAgIGRlYnVnIFwicHV0ICN7bW9kZWwuX2lkfTogI3tlcnJvci5zdGFjayA/IGVycm9yfVwiXG5cbkNhdGNoIDQwMyBlcnJvcnMgYXMgdGhleSBpbmRpY2F0ZSB0aGUgc3RhdHVzIHdhcyB1cGRhdGVkIGJ5IENvdWNoREIgKHRvbyBmYXN0IGZvciB1cyB0byBzZWUpLlxuXG4gICAgICAgICAgaWYgZXJyb3Iuc3RhdHVzPyBhbmQgZXJyb3Iuc3RhdHVzIGlzIDQwM1xuICAgICAgICAgICAgZGVidWcgXCJSZXBsaWNhdGlvbiBhbHJlYWR5IHN0YXJ0ZWRcIlxuICAgICAgICAgICAgcmV0dXJuXG5cblJlcG9ydCBhbGwgb3RoZXIgZXJyb3JzLlxuXG4gICAgICAgICAgZGVidWcgXCJSZXBsaWNhdGlvbiBmcm9tICN7bW9kZWwuc291cmNlfSBmYWlsZWQuXCJcbiAgICAgICAgICBQcm9taXNlLnJlamVjdCBlcnJvclxuXG5HaXZlIENvdWNoREIgc29tZSB0aW1lIHRvIGJyZWF0aC5cblxuICAgICAgeWllbGQgZGVsYXkgMjAwMFxuXG5Mb2cgdGhlIHN0YXR1cyBvZiB0aGUgcmVwbGljYXRvclxuXG4gICAgICBkb2MgPSB5aWVsZCByZXBsaWNhdG9yXG4gICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG5cbiAgICAgIGRlYnVnICdSZXBsaWNhdGlvbiBzdGF0dXMnLCBkb2NcblxuVG9vbGJveFxuPT09PT09PVxuXG4gICAgUG91Y2hEQiA9IHJlcXVpcmUgJ3BvdWNoZGItY29yZSdcbiAgICAgIC5wbHVnaW4gcmVxdWlyZSAncG91Y2hkYi1hZGFwdGVyLWh0dHAnXG4gICAgICAucGx1Z2luIHJlcXVpcmUgJ3BvdWNoZGItcmVwbGljYXRpb24nXG5cbiAgICBkZWxheSA9IHJlcXVpcmUgJ3RpbWVvdXQtYXMtcHJvbWlzZSdcbiAgICBjcnlwdG8gPSByZXF1aXJlICdjcnlwdG8nXG4gICAgdXJsID0gcmVxdWlyZSAndXJsJ1xuICAgIHBrZyA9IHJlcXVpcmUgJy4vcGFja2FnZS5qc29uJ1xuICAgIGRlYnVnID0gKHJlcXVpcmUgJ3RhbmdpYmxlJykgcGtnLm5hbWVcbiJdfQ==
//# sourceURL=/srv/home/stephane/Artisan/Managed/Telecoms/frantic-team/index.coffee.md