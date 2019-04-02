(function() {
  // `replicate`
  // -----------
  var CouchDB, crypto, debug, delay, pkg, replicate, site, sleep, url,
    hasProp = {}.hasOwnProperty;

  delay = 2000;

  // `replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
  // Before submission, the replication document is passed to the (optional) `extensions` callback.
  // Returns a Promise. Make sure you `catch()` any errors.
  // An optional extra parameter might be used to name a distinct replicator database for storage (supported in CouchDB 2 and above).
  module.exports = replicate = async function(prefix_source, prefix_target, name, extensions_cb, group_name = '') {
    var _rev, comment, doc, id, k, model, replicator, replicator_db, source, sum, target, use_delete, v;
    replicator_db = `${prefix_target}/${group_name}_replicator`;
    replicator = new CouchDB(replicator_db);
    // Here we have multiple solutions, so I'll test them:
    // - either delete any existing document with the same name (this should cancel the replication, based on the CouchDB docs), and recreate a new one;
    use_delete = true;
    // - or use a different ID for documents that describes different replications.

    // use_delete = false

    // The one thing we know doesn't work is using the same document ID for documents that describe different replications (e.g. with different filters: experience shows the replicator doesn't notice and keeps using the old filter).
    // Deleting the replication document should also force the replicator to stop the existing replication and start a new process.
    source = url.parse(prefix_source);
    comment = `replication of ${name} from ${source.host}`;
    debug(`Going to start ${comment}.`);
    // I'm creating a `model` document.. just in case I'd have to revert to manually pushing to `/_replicate` because the replicator is too broken. :)
    model = {
      comment: comment,
      continuous: true,
      // Remove authorization from the source and target, because...
      target: site(prefix_target, name),
      source: site(prefix_source, name)
    };
    await (typeof extensions_cb === "function" ? extensions_cb(model) : void 0);
    // Create a (somewhat) unique ID for the document.
    sum = crypto.createHash('sha256');
    sum.update(JSON.stringify(model));
    id = sum.digest('hex');
    model.comment_id = id;
    // When deleting, we can use the `comment` value since it doesn't have to be unique even if we change the record.
    // When creating documents with different IDs, well, use the computed ID.
    model._id = use_delete ? model.comment : id;
    // Let's get started.
    debug("Going to inject", model);
    // Create the target database if it doesn't already exist.
    target = new CouchDB(`${prefix_target}/${name}`);
    await target.create().catch(function(error) {
      // Catch 412 errors as they indicate the database early exists.
      if ((error.status != null) && error.status === 412) {
        debug("Database already exists");
        return;
      }
      // Report all other errors.
      debug.error(`Creating database ${name} failed.`, error);
      return Promise.reject(error);
    });
    target = null;
    // When using the deletion method, first delete the existing replication document.
    if (use_delete) {
      ({_rev} = (await replicator.get(model._id).catch(function(error) {
        return {};
      })));
      if (_rev != null) {
        await replicator.delete({
          _id: model._id,
          _rev
        });
      }
    }
    // Give CouchDB some time to breath.
    await sleep(delay);
    // Update the replication document.
    ({_rev} = (await replicator.get(model._id).catch(function(error) {
      return {};
    })));
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
    await replicator.put(doc).catch(function(error) {
      // Catch 403 errors as they indicate the status was updated by CouchDB (too fast for us to see).
      if ((error.status != null) && error.status === 403) {
        debug("Replication already started");
        return;
      }
      // Report all other errors.
      debug.error(`Replication from ${model.source} for ${model._id} failed.`, error);
      return Promise.reject(error);
    });
    // Give CouchDB some time to breath.
    await sleep(delay);
    // Log the status of the replicator
    doc = (await replicator.get(model._id).catch(function(error) {
      return {};
    }));
    debug('Replication status', doc);
    replicator = null;
  };

  // Toolbox
  // =======
  CouchDB = require('most-couchdb');

  sleep = function(timeout) {
    return new Promise(function(resolve) {
      return setTimeout(resolve, timeout);
    });
  };

  crypto = require('crypto');

  site = require('frantic-site');

  url = require('url');

  pkg = require('./package.json');

  debug = (require('tangible'))(pkg.name);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5jb2ZmZWUubWQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQTs7QUFBQSxNQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsR0FBQTtJQUFBOztFQUdJLEtBQUEsR0FBUSxLQUhaOzs7Ozs7RUFVSSxNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFBLEdBQVksTUFBQSxRQUFBLENBQUMsYUFBRCxFQUFlLGFBQWYsRUFBNkIsSUFBN0IsRUFBa0MsYUFBbEMsRUFBZ0QsYUFBYSxFQUE3RCxDQUFBO0FBRTNCLFFBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7SUFBQSxhQUFBLEdBQWdCLENBQUEsQ0FBQSxDQUFHLGFBQUgsQ0FBaUIsQ0FBakIsQ0FBQSxDQUFvQixVQUFwQixDQUErQixXQUEvQjtJQUNoQixVQUFBLEdBQWEsSUFBSSxPQUFKLENBQVksYUFBWixFQURiOzs7SUFNQSxVQUFBLEdBQWEsS0FOYjs7Ozs7OztJQWVBLE1BQUEsR0FBUyxHQUFHLENBQUMsS0FBSixDQUFVLGFBQVY7SUFDVCxPQUFBLEdBQVUsQ0FBQSxlQUFBLENBQUEsQ0FBa0IsSUFBbEIsQ0FBdUIsTUFBdkIsQ0FBQSxDQUErQixNQUFNLENBQUMsSUFBdEMsQ0FBQTtJQUNWLEtBQUEsQ0FBTSxDQUFBLGVBQUEsQ0FBQSxDQUFrQixPQUFsQixDQUEwQixDQUExQixDQUFOLEVBakJBOztJQXFCQSxLQUFBLEdBQ0U7TUFBQSxPQUFBLEVBQVMsT0FBVDtNQUNBLFVBQUEsRUFBWSxJQURaOztNQUtBLE1BQUEsRUFBUSxJQUFBLENBQUss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LEtBQUssQ0FBQyxHQURELENBRVYsQ0FBQyxLQUZTLENBRUgsUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUFXLENBQUE7SUFBWCxDQUZHLENBQU47SUFJTixLQUFBLENBQU0sb0JBQU4sRUFBNEIsR0FBNUI7SUFDQSxVQUFBLEdBQWE7RUE1SGMsRUFWakM7Ozs7RUE0SUksT0FBQSxHQUFVLE9BQUEsQ0FBUSxjQUFSOztFQUVWLEtBQUEsR0FBUSxRQUFBLENBQUMsT0FBRCxDQUFBO1dBQWEsSUFBSSxPQUFKLENBQVksUUFBQSxDQUFDLE9BQUQsQ0FBQTthQUFhLFVBQUEsQ0FBVyxPQUFYLEVBQW9CLE9BQXBCO0lBQWIsQ0FBWjtFQUFiOztFQUNSLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFDVCxJQUFBLEdBQU8sT0FBQSxDQUFRLGNBQVI7O0VBQ1AsR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNOLEdBQUEsR0FBTSxPQUFBLENBQVEsZ0JBQVI7O0VBQ04sS0FBQSxHQUFRLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFBLENBQXFCLEdBQUcsQ0FBQyxJQUF6QjtBQW5KWiIsInNvdXJjZXNDb250ZW50IjpbImByZXBsaWNhdGVgXG4tLS0tLS0tLS0tLVxuXG4gICAgZGVsYXkgPSAyMDAwXG5cbmByZXBsaWNhdGUoc291cmNlLHRhcmdldCxuYW1lLGV4dGVuc2lvbnMpYDogcmVwbGljYXRlIGRhdGFiYXNlIGBuYW1lYCBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIChhbGwgc3RyaW5ncykgYnkgY3JlYXRpbmcgYSByZXBsaWNhdGlvbiBgcHVsbGAgZG9jdW1lbnQgb24gdGhlIHRhcmdldC5cbkJlZm9yZSBzdWJtaXNzaW9uLCB0aGUgcmVwbGljYXRpb24gZG9jdW1lbnQgaXMgcGFzc2VkIHRvIHRoZSAob3B0aW9uYWwpIGBleHRlbnNpb25zYCBjYWxsYmFjay5cblJldHVybnMgYSBQcm9taXNlLiBNYWtlIHN1cmUgeW91IGBjYXRjaCgpYCBhbnkgZXJyb3JzLlxuQW4gb3B0aW9uYWwgZXh0cmEgcGFyYW1ldGVyIG1pZ2h0IGJlIHVzZWQgdG8gbmFtZSBhIGRpc3RpbmN0IHJlcGxpY2F0b3IgZGF0YWJhc2UgZm9yIHN0b3JhZ2UgKHN1cHBvcnRlZCBpbiBDb3VjaERCIDIgYW5kIGFib3ZlKS5cblxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVwbGljYXRlID0gKHByZWZpeF9zb3VyY2UscHJlZml4X3RhcmdldCxuYW1lLGV4dGVuc2lvbnNfY2IsZ3JvdXBfbmFtZSA9ICcnKSAtPlxuXG4gICAgICByZXBsaWNhdG9yX2RiID0gXCIje3ByZWZpeF90YXJnZXR9LyN7Z3JvdXBfbmFtZX1fcmVwbGljYXRvclwiXG4gICAgICByZXBsaWNhdG9yID0gbmV3IENvdWNoREIgcmVwbGljYXRvcl9kYlxuXG5IZXJlIHdlIGhhdmUgbXVsdGlwbGUgc29sdXRpb25zLCBzbyBJJ2xsIHRlc3QgdGhlbTpcbi0gZWl0aGVyIGRlbGV0ZSBhbnkgZXhpc3RpbmcgZG9jdW1lbnQgd2l0aCB0aGUgc2FtZSBuYW1lICh0aGlzIHNob3VsZCBjYW5jZWwgdGhlIHJlcGxpY2F0aW9uLCBiYXNlZCBvbiB0aGUgQ291Y2hEQiBkb2NzKSwgYW5kIHJlY3JlYXRlIGEgbmV3IG9uZTtcblxuICAgICAgdXNlX2RlbGV0ZSA9IHRydWVcblxuLSBvciB1c2UgYSBkaWZmZXJlbnQgSUQgZm9yIGRvY3VtZW50cyB0aGF0IGRlc2NyaWJlcyBkaWZmZXJlbnQgcmVwbGljYXRpb25zLlxuXG4gICAgICAjIHVzZV9kZWxldGUgPSBmYWxzZVxuXG5UaGUgb25lIHRoaW5nIHdlIGtub3cgZG9lc24ndCB3b3JrIGlzIHVzaW5nIHRoZSBzYW1lIGRvY3VtZW50IElEIGZvciBkb2N1bWVudHMgdGhhdCBkZXNjcmliZSBkaWZmZXJlbnQgcmVwbGljYXRpb25zIChlLmcuIHdpdGggZGlmZmVyZW50IGZpbHRlcnM6IGV4cGVyaWVuY2Ugc2hvd3MgdGhlIHJlcGxpY2F0b3IgZG9lc24ndCBub3RpY2UgYW5kIGtlZXBzIHVzaW5nIHRoZSBvbGQgZmlsdGVyKS5cbkRlbGV0aW5nIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudCBzaG91bGQgYWxzbyBmb3JjZSB0aGUgcmVwbGljYXRvciB0byBzdG9wIHRoZSBleGlzdGluZyByZXBsaWNhdGlvbiBhbmQgc3RhcnQgYSBuZXcgcHJvY2Vzcy5cblxuICAgICAgc291cmNlID0gdXJsLnBhcnNlIHByZWZpeF9zb3VyY2VcbiAgICAgIGNvbW1lbnQgPSBcInJlcGxpY2F0aW9uIG9mICN7bmFtZX0gZnJvbSAje3NvdXJjZS5ob3N0fVwiXG4gICAgICBkZWJ1ZyBcIkdvaW5nIHRvIHN0YXJ0ICN7Y29tbWVudH0uXCJcblxuSSdtIGNyZWF0aW5nIGEgYG1vZGVsYCBkb2N1bWVudC4uIGp1c3QgaW4gY2FzZSBJJ2QgaGF2ZSB0byByZXZlcnQgdG8gbWFudWFsbHkgcHVzaGluZyB0byBgL19yZXBsaWNhdGVgIGJlY2F1c2UgdGhlIHJlcGxpY2F0b3IgaXMgdG9vIGJyb2tlbi4gOilcblxuICAgICAgbW9kZWwgPVxuICAgICAgICBjb21tZW50OiBjb21tZW50XG4gICAgICAgIGNvbnRpbnVvdXM6IHRydWVcblxuUmVtb3ZlIGF1dGhvcml6YXRpb24gZnJvbSB0aGUgc291cmNlIGFuZCB0YXJnZXQsIGJlY2F1c2UuLi5cblxuICAgICAgICB0YXJnZXQ6IHNpdGUgcHJlZml4X3RhcmdldCwgbmFtZVxuICAgICAgICBzb3VyY2U6IHNpdGUgcHJlZml4X3NvdXJjZSwgbmFtZVxuXG5MZXQgdGhlIGNhbGxiYWNrIGFkZCBhbnkgZmllbGQgdGhleSdkIGxpa2UuXG5Ob3RlOiB0aGUgY2FsbGJhY2sgbWlnaHQgYWxzbyBwcmV2ZW50IHJlcGxpY2F0aW9uIGlmIGl0IHRocm93cy4gVGhpcyBpcyBpbnRlbnRpb25hbC5cbk5vdGU6IHRoZSBjYWxsYmFjayBtaWdodCByZXR1cm4gYSBQcm9taXNlLiBPciBub3QuIFdlJ2xsIGRlYWwgd2l0aCBib3RoLlxuXG4gICAgICBhd2FpdCBleHRlbnNpb25zX2NiPyBtb2RlbFxuXG5DcmVhdGUgYSAoc29tZXdoYXQpIHVuaXF1ZSBJRCBmb3IgdGhlIGRvY3VtZW50LlxuXG4gICAgICBzdW0gPSBjcnlwdG8uY3JlYXRlSGFzaCAnc2hhMjU2J1xuICAgICAgc3VtLnVwZGF0ZSBKU09OLnN0cmluZ2lmeSBtb2RlbFxuICAgICAgaWQgPSBzdW0uZGlnZXN0ICdoZXgnXG4gICAgICBtb2RlbC5jb21tZW50X2lkID0gaWRcblxuV2hlbiBkZWxldGluZywgd2UgY2FuIHVzZSB0aGUgYGNvbW1lbnRgIHZhbHVlIHNpbmNlIGl0IGRvZXNuJ3QgaGF2ZSB0byBiZSB1bmlxdWUgZXZlbiBpZiB3ZSBjaGFuZ2UgdGhlIHJlY29yZC5cbldoZW4gY3JlYXRpbmcgZG9jdW1lbnRzIHdpdGggZGlmZmVyZW50IElEcywgd2VsbCwgdXNlIHRoZSBjb21wdXRlZCBJRC5cblxuICAgICAgbW9kZWwuX2lkID0gaWYgdXNlX2RlbGV0ZSB0aGVuIG1vZGVsLmNvbW1lbnQgZWxzZSBpZFxuXG5MZXQncyBnZXQgc3RhcnRlZC5cblxuICAgICAgZGVidWcgXCJHb2luZyB0byBpbmplY3RcIiwgbW9kZWxcblxuQ3JlYXRlIHRoZSB0YXJnZXQgZGF0YWJhc2UgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0LlxuXG4gICAgICB0YXJnZXQgPSBuZXcgQ291Y2hEQiBcIiN7cHJlZml4X3RhcmdldH0vI3tuYW1lfVwiXG4gICAgICBhd2FpdCB0YXJnZXQuY3JlYXRlKClcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT5cblxuQ2F0Y2ggNDEyIGVycm9ycyBhcyB0aGV5IGluZGljYXRlIHRoZSBkYXRhYmFzZSBlYXJseSBleGlzdHMuXG5cbiAgICAgICAgICBpZiBlcnJvci5zdGF0dXM/IGFuZCBlcnJvci5zdGF0dXMgaXMgNDEyXG4gICAgICAgICAgICBkZWJ1ZyBcIkRhdGFiYXNlIGFscmVhZHkgZXhpc3RzXCJcbiAgICAgICAgICAgIHJldHVyblxuXG5SZXBvcnQgYWxsIG90aGVyIGVycm9ycy5cblxuICAgICAgICAgIGRlYnVnLmVycm9yIFwiQ3JlYXRpbmcgZGF0YWJhc2UgI3tuYW1lfSBmYWlsZWQuXCIsIGVycm9yXG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QgZXJyb3JcblxuICAgICAgdGFyZ2V0ID0gbnVsbFxuXG5XaGVuIHVzaW5nIHRoZSBkZWxldGlvbiBtZXRob2QsIGZpcnN0IGRlbGV0ZSB0aGUgZXhpc3RpbmcgcmVwbGljYXRpb24gZG9jdW1lbnQuXG5cbiAgICAgIGlmIHVzZV9kZWxldGVcbiAgICAgICAge19yZXZ9ID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cbiAgICAgICAgYXdhaXQgcmVwbGljYXRvci5kZWxldGUge19pZDptb2RlbC5faWQsIF9yZXZ9IGlmIF9yZXY/XG5cbkdpdmUgQ291Y2hEQiBzb21lIHRpbWUgdG8gYnJlYXRoLlxuXG4gICAgICBhd2FpdCBzbGVlcCBkZWxheVxuXG5VcGRhdGUgdGhlIHJlcGxpY2F0aW9uIGRvY3VtZW50LlxuXG4gICAgICB7X3Jldn0gPSBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG5cbiAgICAgIGRvYyA9IHt9XG4gICAgICBkb2MuX3JldiA9IF9yZXYgaWYgX3Jldj9cbiAgICAgIGZvciBvd24gayx2IG9mIG1vZGVsXG4gICAgICAgIGRvY1trXSA9IHZcblxuICAgICAgZGVidWcgJ0NyZWF0aW5nIHJlcGxpY2F0aW9uJywgZG9jXG5cbiAgICAgIGF3YWl0IHJlcGxpY2F0b3JcbiAgICAgICAgLnB1dCBkb2NcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT5cblxuQ2F0Y2ggNDAzIGVycm9ycyBhcyB0aGV5IGluZGljYXRlIHRoZSBzdGF0dXMgd2FzIHVwZGF0ZWQgYnkgQ291Y2hEQiAodG9vIGZhc3QgZm9yIHVzIHRvIHNlZSkuXG5cbiAgICAgICAgICBpZiBlcnJvci5zdGF0dXM/IGFuZCBlcnJvci5zdGF0dXMgaXMgNDAzXG4gICAgICAgICAgICBkZWJ1ZyBcIlJlcGxpY2F0aW9uIGFscmVhZHkgc3RhcnRlZFwiXG4gICAgICAgICAgICByZXR1cm5cblxuUmVwb3J0IGFsbCBvdGhlciBlcnJvcnMuXG5cbiAgICAgICAgICBkZWJ1Zy5lcnJvciBcIlJlcGxpY2F0aW9uIGZyb20gI3ttb2RlbC5zb3VyY2V9IGZvciAje21vZGVsLl9pZH0gZmFpbGVkLlwiLCBlcnJvclxuICAgICAgICAgIFByb21pc2UucmVqZWN0IGVycm9yXG5cbkdpdmUgQ291Y2hEQiBzb21lIHRpbWUgdG8gYnJlYXRoLlxuXG4gICAgICBhd2FpdCBzbGVlcCBkZWxheVxuXG5Mb2cgdGhlIHN0YXR1cyBvZiB0aGUgcmVwbGljYXRvclxuXG4gICAgICBkb2MgPSBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG5cbiAgICAgIGRlYnVnICdSZXBsaWNhdGlvbiBzdGF0dXMnLCBkb2NcbiAgICAgIHJlcGxpY2F0b3IgPSBudWxsXG4gICAgICByZXR1cm5cblxuVG9vbGJveFxuPT09PT09PVxuXG4gICAgQ291Y2hEQiA9IHJlcXVpcmUgJ21vc3QtY291Y2hkYidcblxuICAgIHNsZWVwID0gKHRpbWVvdXQpIC0+IG5ldyBQcm9taXNlIChyZXNvbHZlKSAtPiBzZXRUaW1lb3V0IHJlc29sdmUsIHRpbWVvdXRcbiAgICBjcnlwdG8gPSByZXF1aXJlICdjcnlwdG8nXG4gICAgc2l0ZSA9IHJlcXVpcmUgJ2ZyYW50aWMtc2l0ZSdcbiAgICB1cmwgPSByZXF1aXJlICd1cmwnXG4gICAgcGtnID0gcmVxdWlyZSAnLi9wYWNrYWdlLmpzb24nXG4gICAgZGVidWcgPSAocmVxdWlyZSAndGFuZ2libGUnKSBwa2cubmFtZVxuIl19
//# sourceURL=/dev/shm/more/frantic-team/index.coffee.md