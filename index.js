(function() {
  // `replicate`
  // -----------
  var CouchDB, crypto, debug, delay, pkg, replicate, sleep, url,
    hasProp = {}.hasOwnProperty;

  delay = 2000;

  // `replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
  // Before submission, the replication document is passed to the (optional) `extensions` callback.
  // Returns a Promise. Make sure you `catch()` any errors.
  // An optional extra parameter might be used to name a distinct replicator database for storage (supported in CouchDB 2 and above).
  module.exports = replicate = async function(prefix_source, prefix_target, name, extensions_cb, group_name = '') {
    var _rev, auth, comment, doc, id, k, model, replicator, replicator_db, source, sum, target, use_delete, v;
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
    target = url.parse(prefix_target);
    comment = `replication of ${name} from ${source.host}`;
    debug(`Going to start ${comment}.`);
    // I'm creating a `model` document.. just in case I'd have to revert to manually pushing to `/_replicate` because the replicator is too broken. :)
    model = {
      comment: comment,
      continuous: true,
      // Remove authorization from the source and target, because...
      target: {
        url: url.format({
          protocol: target.protocol,
          host: target.host,
          pathname: name
        })
      },
      source: {
        url: url.format({
          protocol: source.protocol,
          host: source.host,
          pathname: name
        })
      }
    };
    // ...even with CouchDB ~~1.6.1~~ 2.1.1 we still have the issue with CouchDB not properly managing authorization headers when a username and password are provided in the original URI that contains "special" characters (like `@` or space). So let's handle it ourselves.
    if (source.auth != null) {
      auth = (Buffer.from(source.auth)).toString('base64');
      debug(`Encoded \`${source.auth}\` of \`${prefix_source}\` as \`${auth}\`.`);
      model.source.headers = {
        Authorization: `Basic ${auth}`
      };
    }
    if (target.auth != null) {
      auth = (Buffer.from(target.auth)).toString('base64');
      debug(`Encoded \`${target.auth}\` of \`${prefix_target}\` as \`${auth}\`.`);
      model.target.headers = {
        Authorization: `Basic ${auth}`
      };
    }
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

  url = require('url');

  pkg = require('./package.json');

  debug = (require('tangible'))(pkg.name);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5jb2ZmZWUubWQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQTs7QUFBQSxNQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBO0lBQUE7O0VBR0ksS0FBQSxHQUFRLEtBSFo7Ozs7OztFQVVJLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUEsR0FBWSxNQUFBLFFBQUEsQ0FBQyxhQUFELEVBQWUsYUFBZixFQUE2QixJQUE3QixFQUFrQyxhQUFsQyxFQUFnRCxhQUFhLEVBQTdELENBQUE7QUFFM0IsUUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7SUFBQSxhQUFBLEdBQWdCLENBQUEsQ0FBQSxDQUFHLGFBQUgsQ0FBaUIsQ0FBakIsQ0FBQSxDQUFvQixVQUFwQixDQUErQixXQUEvQjtJQUNoQixVQUFBLEdBQWEsSUFBSSxPQUFKLENBQVksYUFBWixFQURiOzs7SUFNQSxVQUFBLEdBQWEsS0FOYjs7Ozs7OztJQWVBLE1BQUEsR0FBUyxHQUFHLENBQUMsS0FBSixDQUFVLGFBQVY7SUFDVCxNQUFBLEdBQVMsR0FBRyxDQUFDLEtBQUosQ0FBVSxhQUFWO0lBQ1QsT0FBQSxHQUFVLENBQUEsZUFBQSxDQUFBLENBQWtCLElBQWxCLENBQXVCLE1BQXZCLENBQUEsQ0FBK0IsTUFBTSxDQUFDLElBQXRDLENBQUE7SUFDVixLQUFBLENBQU0sQ0FBQSxlQUFBLENBQUEsQ0FBa0IsT0FBbEIsQ0FBMEIsQ0FBMUIsQ0FBTixFQWxCQTs7SUFzQkEsS0FBQSxHQUNFO01BQUEsT0FBQSxFQUFTLE9BQVQ7TUFDQSxV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QUMsR0FERCxDQUVWLENBQUMsS0FGUyxDQUVILFFBQUEsQ0FBQyxLQUFELENBQUE7YUFBVyxDQUFBO0lBQVgsQ0FGRyxDQUFOO0lBSU4sS0FBQSxDQUFNLG9CQUFOLEVBQTRCLEdBQTVCO0lBQ0EsVUFBQSxHQUFhO0VBbkpjLEVBVmpDOzs7O0VBbUtJLE9BQUEsR0FBVSxPQUFBLENBQVEsY0FBUjs7RUFFVixLQUFBLEdBQVEsUUFBQSxDQUFDLE9BQUQsQ0FBQTtXQUFhLElBQUksT0FBSixDQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7YUFBYSxVQUFBLENBQVcsT0FBWCxFQUFvQixPQUFwQjtJQUFiLENBQVo7RUFBYjs7RUFDUixNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsR0FBQSxHQUFNLE9BQUEsQ0FBUSxLQUFSOztFQUNOLEdBQUEsR0FBTSxPQUFBLENBQVEsZ0JBQVI7O0VBQ04sS0FBQSxHQUFRLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFBLENBQXFCLEdBQUcsQ0FBQyxJQUF6QjtBQXpLWiIsInNvdXJjZXNDb250ZW50IjpbImByZXBsaWNhdGVgXG4tLS0tLS0tLS0tLVxuXG4gICAgZGVsYXkgPSAyMDAwXG5cbmByZXBsaWNhdGUoc291cmNlLHRhcmdldCxuYW1lLGV4dGVuc2lvbnMpYDogcmVwbGljYXRlIGRhdGFiYXNlIGBuYW1lYCBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIChhbGwgc3RyaW5ncykgYnkgY3JlYXRpbmcgYSByZXBsaWNhdGlvbiBgcHVsbGAgZG9jdW1lbnQgb24gdGhlIHRhcmdldC5cbkJlZm9yZSBzdWJtaXNzaW9uLCB0aGUgcmVwbGljYXRpb24gZG9jdW1lbnQgaXMgcGFzc2VkIHRvIHRoZSAob3B0aW9uYWwpIGBleHRlbnNpb25zYCBjYWxsYmFjay5cblJldHVybnMgYSBQcm9taXNlLiBNYWtlIHN1cmUgeW91IGBjYXRjaCgpYCBhbnkgZXJyb3JzLlxuQW4gb3B0aW9uYWwgZXh0cmEgcGFyYW1ldGVyIG1pZ2h0IGJlIHVzZWQgdG8gbmFtZSBhIGRpc3RpbmN0IHJlcGxpY2F0b3IgZGF0YWJhc2UgZm9yIHN0b3JhZ2UgKHN1cHBvcnRlZCBpbiBDb3VjaERCIDIgYW5kIGFib3ZlKS5cblxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVwbGljYXRlID0gKHByZWZpeF9zb3VyY2UscHJlZml4X3RhcmdldCxuYW1lLGV4dGVuc2lvbnNfY2IsZ3JvdXBfbmFtZSA9ICcnKSAtPlxuXG4gICAgICByZXBsaWNhdG9yX2RiID0gXCIje3ByZWZpeF90YXJnZXR9LyN7Z3JvdXBfbmFtZX1fcmVwbGljYXRvclwiXG4gICAgICByZXBsaWNhdG9yID0gbmV3IENvdWNoREIgcmVwbGljYXRvcl9kYlxuXG5IZXJlIHdlIGhhdmUgbXVsdGlwbGUgc29sdXRpb25zLCBzbyBJJ2xsIHRlc3QgdGhlbTpcbi0gZWl0aGVyIGRlbGV0ZSBhbnkgZXhpc3RpbmcgZG9jdW1lbnQgd2l0aCB0aGUgc2FtZSBuYW1lICh0aGlzIHNob3VsZCBjYW5jZWwgdGhlIHJlcGxpY2F0aW9uLCBiYXNlZCBvbiB0aGUgQ291Y2hEQiBkb2NzKSwgYW5kIHJlY3JlYXRlIGEgbmV3IG9uZTtcblxuICAgICAgdXNlX2RlbGV0ZSA9IHRydWVcblxuLSBvciB1c2UgYSBkaWZmZXJlbnQgSUQgZm9yIGRvY3VtZW50cyB0aGF0IGRlc2NyaWJlcyBkaWZmZXJlbnQgcmVwbGljYXRpb25zLlxuXG4gICAgICAjIHVzZV9kZWxldGUgPSBmYWxzZVxuXG5UaGUgb25lIHRoaW5nIHdlIGtub3cgZG9lc24ndCB3b3JrIGlzIHVzaW5nIHRoZSBzYW1lIGRvY3VtZW50IElEIGZvciBkb2N1bWVudHMgdGhhdCBkZXNjcmliZSBkaWZmZXJlbnQgcmVwbGljYXRpb25zIChlLmcuIHdpdGggZGlmZmVyZW50IGZpbHRlcnM6IGV4cGVyaWVuY2Ugc2hvd3MgdGhlIHJlcGxpY2F0b3IgZG9lc24ndCBub3RpY2UgYW5kIGtlZXBzIHVzaW5nIHRoZSBvbGQgZmlsdGVyKS5cbkRlbGV0aW5nIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudCBzaG91bGQgYWxzbyBmb3JjZSB0aGUgcmVwbGljYXRvciB0byBzdG9wIHRoZSBleGlzdGluZyByZXBsaWNhdGlvbiBhbmQgc3RhcnQgYSBuZXcgcHJvY2Vzcy5cblxuICAgICAgc291cmNlID0gdXJsLnBhcnNlIHByZWZpeF9zb3VyY2VcbiAgICAgIHRhcmdldCA9IHVybC5wYXJzZSBwcmVmaXhfdGFyZ2V0XG4gICAgICBjb21tZW50ID0gXCJyZXBsaWNhdGlvbiBvZiAje25hbWV9IGZyb20gI3tzb3VyY2UuaG9zdH1cIlxuICAgICAgZGVidWcgXCJHb2luZyB0byBzdGFydCAje2NvbW1lbnR9LlwiXG5cbkknbSBjcmVhdGluZyBhIGBtb2RlbGAgZG9jdW1lbnQuLiBqdXN0IGluIGNhc2UgSSdkIGhhdmUgdG8gcmV2ZXJ0IHRvIG1hbnVhbGx5IHB1c2hpbmcgdG8gYC9fcmVwbGljYXRlYCBiZWNhdXNlIHRoZSByZXBsaWNhdG9yIGlzIHRvbyBicm9rZW4uIDopXG5cbiAgICAgIG1vZGVsID1cbiAgICAgICAgY29tbWVudDogY29tbWVudFxuICAgICAgICBjb250aW51b3VzOiB0cnVlXG5cblJlbW92ZSBhdXRob3JpemF0aW9uIGZyb20gdGhlIHNvdXJjZSBhbmQgdGFyZ2V0LCBiZWNhdXNlLi4uXG5cbiAgICAgICAgdGFyZ2V0OlxuICAgICAgICAgIHVybDogdXJsLmZvcm1hdFxuICAgICAgICAgICAgcHJvdG9jb2w6IHRhcmdldC5wcm90b2NvbFxuICAgICAgICAgICAgaG9zdDogdGFyZ2V0Lmhvc3RcbiAgICAgICAgICAgIHBhdGhuYW1lOiBuYW1lXG4gICAgICAgIHNvdXJjZTpcbiAgICAgICAgICB1cmw6IHVybC5mb3JtYXRcbiAgICAgICAgICAgIHByb3RvY29sOiBzb3VyY2UucHJvdG9jb2xcbiAgICAgICAgICAgIGhvc3Q6IHNvdXJjZS5ob3N0XG4gICAgICAgICAgICBwYXRobmFtZTogbmFtZVxuXG4uLi5ldmVuIHdpdGggQ291Y2hEQiB+fjEuNi4xfn4gMi4xLjEgd2Ugc3RpbGwgaGF2ZSB0aGUgaXNzdWUgd2l0aCBDb3VjaERCIG5vdCBwcm9wZXJseSBtYW5hZ2luZyBhdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBhIHVzZXJuYW1lIGFuZCBwYXNzd29yZCBhcmUgcHJvdmlkZWQgaW4gdGhlIG9yaWdpbmFsIFVSSSB0aGF0IGNvbnRhaW5zIFwic3BlY2lhbFwiIGNoYXJhY3RlcnMgKGxpa2UgYEBgIG9yIHNwYWNlKS4gU28gbGV0J3MgaGFuZGxlIGl0IG91cnNlbHZlcy5cblxuICAgICAgaWYgc291cmNlLmF1dGg/XG4gICAgICAgIGF1dGggPSAoQnVmZmVyLmZyb20gc291cmNlLmF1dGgpLnRvU3RyaW5nICdiYXNlNjQnXG4gICAgICAgIGRlYnVnIFwiRW5jb2RlZCBgI3tzb3VyY2UuYXV0aH1gIG9mIGAje3ByZWZpeF9zb3VyY2V9YCBhcyBgI3thdXRofWAuXCJcbiAgICAgICAgbW9kZWwuc291cmNlLmhlYWRlcnMgPVxuICAgICAgICAgIEF1dGhvcml6YXRpb246IFwiQmFzaWMgI3thdXRofVwiXG5cbiAgICAgIGlmIHRhcmdldC5hdXRoP1xuICAgICAgICBhdXRoID0gKEJ1ZmZlci5mcm9tIHRhcmdldC5hdXRoKS50b1N0cmluZyAnYmFzZTY0J1xuICAgICAgICBkZWJ1ZyBcIkVuY29kZWQgYCN7dGFyZ2V0LmF1dGh9YCBvZiBgI3twcmVmaXhfdGFyZ2V0fWAgYXMgYCN7YXV0aH1gLlwiXG4gICAgICAgIG1vZGVsLnRhcmdldC5oZWFkZXJzID1cbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBcIkJhc2ljICN7YXV0aH1cIlxuXG5MZXQgdGhlIGNhbGxiYWNrIGFkZCBhbnkgZmllbGQgdGhleSdkIGxpa2UuXG5Ob3RlOiB0aGUgY2FsbGJhY2sgbWlnaHQgYWxzbyBwcmV2ZW50IHJlcGxpY2F0aW9uIGlmIGl0IHRocm93cy4gVGhpcyBpcyBpbnRlbnRpb25hbC5cbk5vdGU6IHRoZSBjYWxsYmFjayBtaWdodCByZXR1cm4gYSBQcm9taXNlLiBPciBub3QuIFdlJ2xsIGRlYWwgd2l0aCBib3RoLlxuXG4gICAgICBhd2FpdCBleHRlbnNpb25zX2NiPyBtb2RlbFxuXG5DcmVhdGUgYSAoc29tZXdoYXQpIHVuaXF1ZSBJRCBmb3IgdGhlIGRvY3VtZW50LlxuXG4gICAgICBzdW0gPSBjcnlwdG8uY3JlYXRlSGFzaCAnc2hhMjU2J1xuICAgICAgc3VtLnVwZGF0ZSBKU09OLnN0cmluZ2lmeSBtb2RlbFxuICAgICAgaWQgPSBzdW0uZGlnZXN0ICdoZXgnXG4gICAgICBtb2RlbC5jb21tZW50X2lkID0gaWRcblxuV2hlbiBkZWxldGluZywgd2UgY2FuIHVzZSB0aGUgYGNvbW1lbnRgIHZhbHVlIHNpbmNlIGl0IGRvZXNuJ3QgaGF2ZSB0byBiZSB1bmlxdWUgZXZlbiBpZiB3ZSBjaGFuZ2UgdGhlIHJlY29yZC5cbldoZW4gY3JlYXRpbmcgZG9jdW1lbnRzIHdpdGggZGlmZmVyZW50IElEcywgd2VsbCwgdXNlIHRoZSBjb21wdXRlZCBJRC5cblxuICAgICAgbW9kZWwuX2lkID0gaWYgdXNlX2RlbGV0ZSB0aGVuIG1vZGVsLmNvbW1lbnQgZWxzZSBpZFxuXG5MZXQncyBnZXQgc3RhcnRlZC5cblxuICAgICAgZGVidWcgXCJHb2luZyB0byBpbmplY3RcIiwgbW9kZWxcblxuQ3JlYXRlIHRoZSB0YXJnZXQgZGF0YWJhc2UgaWYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0LlxuXG4gICAgICB0YXJnZXQgPSBuZXcgQ291Y2hEQiBcIiN7cHJlZml4X3RhcmdldH0vI3tuYW1lfVwiXG4gICAgICBhd2FpdCB0YXJnZXQuY3JlYXRlKClcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT5cblxuQ2F0Y2ggNDEyIGVycm9ycyBhcyB0aGV5IGluZGljYXRlIHRoZSBkYXRhYmFzZSBlYXJseSBleGlzdHMuXG5cbiAgICAgICAgICBpZiBlcnJvci5zdGF0dXM/IGFuZCBlcnJvci5zdGF0dXMgaXMgNDEyXG4gICAgICAgICAgICBkZWJ1ZyBcIkRhdGFiYXNlIGFscmVhZHkgZXhpc3RzXCJcbiAgICAgICAgICAgIHJldHVyblxuXG5SZXBvcnQgYWxsIG90aGVyIGVycm9ycy5cblxuICAgICAgICAgIGRlYnVnLmVycm9yIFwiQ3JlYXRpbmcgZGF0YWJhc2UgI3tuYW1lfSBmYWlsZWQuXCIsIGVycm9yXG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QgZXJyb3JcblxuICAgICAgdGFyZ2V0ID0gbnVsbFxuXG5XaGVuIHVzaW5nIHRoZSBkZWxldGlvbiBtZXRob2QsIGZpcnN0IGRlbGV0ZSB0aGUgZXhpc3RpbmcgcmVwbGljYXRpb24gZG9jdW1lbnQuXG5cbiAgICAgIGlmIHVzZV9kZWxldGVcbiAgICAgICAge19yZXZ9ID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cbiAgICAgICAgYXdhaXQgcmVwbGljYXRvci5kZWxldGUge19pZDptb2RlbC5faWQsIF9yZXZ9IGlmIF9yZXY/XG5cbkdpdmUgQ291Y2hEQiBzb21lIHRpbWUgdG8gYnJlYXRoLlxuXG4gICAgICBhd2FpdCBzbGVlcCBkZWxheVxuXG5VcGRhdGUgdGhlIHJlcGxpY2F0aW9uIGRvY3VtZW50LlxuXG4gICAgICB7X3Jldn0gPSBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG5cbiAgICAgIGRvYyA9IHt9XG4gICAgICBkb2MuX3JldiA9IF9yZXYgaWYgX3Jldj9cbiAgICAgIGZvciBvd24gayx2IG9mIG1vZGVsXG4gICAgICAgIGRvY1trXSA9IHZcblxuICAgICAgZGVidWcgJ0NyZWF0aW5nIHJlcGxpY2F0aW9uJywgZG9jXG5cbiAgICAgIGF3YWl0IHJlcGxpY2F0b3JcbiAgICAgICAgLnB1dCBkb2NcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT5cblxuQ2F0Y2ggNDAzIGVycm9ycyBhcyB0aGV5IGluZGljYXRlIHRoZSBzdGF0dXMgd2FzIHVwZGF0ZWQgYnkgQ291Y2hEQiAodG9vIGZhc3QgZm9yIHVzIHRvIHNlZSkuXG5cbiAgICAgICAgICBpZiBlcnJvci5zdGF0dXM/IGFuZCBlcnJvci5zdGF0dXMgaXMgNDAzXG4gICAgICAgICAgICBkZWJ1ZyBcIlJlcGxpY2F0aW9uIGFscmVhZHkgc3RhcnRlZFwiXG4gICAgICAgICAgICByZXR1cm5cblxuUmVwb3J0IGFsbCBvdGhlciBlcnJvcnMuXG5cbiAgICAgICAgICBkZWJ1Zy5lcnJvciBcIlJlcGxpY2F0aW9uIGZyb20gI3ttb2RlbC5zb3VyY2V9IGZvciAje21vZGVsLl9pZH0gZmFpbGVkLlwiLCBlcnJvclxuICAgICAgICAgIFByb21pc2UucmVqZWN0IGVycm9yXG5cbkdpdmUgQ291Y2hEQiBzb21lIHRpbWUgdG8gYnJlYXRoLlxuXG4gICAgICBhd2FpdCBzbGVlcCBkZWxheVxuXG5Mb2cgdGhlIHN0YXR1cyBvZiB0aGUgcmVwbGljYXRvclxuXG4gICAgICBkb2MgPSBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG5cbiAgICAgIGRlYnVnICdSZXBsaWNhdGlvbiBzdGF0dXMnLCBkb2NcbiAgICAgIHJlcGxpY2F0b3IgPSBudWxsXG4gICAgICByZXR1cm5cblxuVG9vbGJveFxuPT09PT09PVxuXG4gICAgQ291Y2hEQiA9IHJlcXVpcmUgJ21vc3QtY291Y2hkYidcblxuICAgIHNsZWVwID0gKHRpbWVvdXQpIC0+IG5ldyBQcm9taXNlIChyZXNvbHZlKSAtPiBzZXRUaW1lb3V0IHJlc29sdmUsIHRpbWVvdXRcbiAgICBjcnlwdG8gPSByZXF1aXJlICdjcnlwdG8nXG4gICAgdXJsID0gcmVxdWlyZSAndXJsJ1xuICAgIHBrZyA9IHJlcXVpcmUgJy4vcGFja2FnZS5qc29uJ1xuICAgIGRlYnVnID0gKHJlcXVpcmUgJ3RhbmdpYmxlJykgcGtnLm5hbWVcbiJdfQ==
//# sourceURL=/dev/shm/more/frantic-team/index.coffee.md