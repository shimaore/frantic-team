(function() {
  // `replicate`
  // -----------
  var CouchDB, crypto, debug, delay, pkg, replicate, sleep, url,
    hasProp = {}.hasOwnProperty;

  delay = 2000;

  // `replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
  // Before submission, the replication document is passed to the (optional) `extensions` callback.
  // Returns a Promise. Make sure you `catch()` any errors.
  module.exports = replicate = async function(prefix_source, prefix_target, name, extensions_cb) {
    var _rev, auth, comment, doc, id, k, model, replicator, replicator_db, source, sum, target, use_delete, v;
    replicator_db = `${prefix_target}/_replicator`;
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
      debug.error(`create ${name}`, error);
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
          id: model._id,
          rev: _rev
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
      debug.error(`put ${model._id}`, error);
      // Catch 403 errors as they indicate the status was updated by CouchDB (too fast for us to see).
      if ((error.status != null) && error.status === 403) {
        debug("Replication already started");
        return;
      }
      // Report all other errors.
      debug.error(`Replication from ${model.source} failed.`, error);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5jb2ZmZWUubWQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQTs7QUFBQSxNQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBO0lBQUE7O0VBR0ksS0FBQSxHQUFRLEtBSFo7Ozs7O0VBU0ksTUFBTSxDQUFDLE9BQVAsR0FBaUIsU0FBQSxHQUFZLE1BQUEsUUFBQSxDQUFDLGFBQUQsRUFBZSxhQUFmLEVBQTZCLElBQTdCLEVBQWtDLGFBQWxDLENBQUE7QUFFM0IsUUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7SUFBQSxhQUFBLEdBQWdCLENBQUEsQ0FBQSxDQUFHLGFBQUgsQ0FBaUIsWUFBakI7SUFDaEIsVUFBQSxHQUFhLElBQUksT0FBSixDQUFZLGFBQVosRUFEYjs7O0lBTUEsVUFBQSxHQUFhLEtBTmI7Ozs7Ozs7SUFlQSxNQUFBLEdBQVMsR0FBRyxDQUFDLEtBQUosQ0FBVSxhQUFWO0lBQ1QsTUFBQSxHQUFTLEdBQUcsQ0FBQyxLQUFKLENBQVUsYUFBVjtJQUNULE9BQUEsR0FBVSxDQUFBLGVBQUEsQ0FBQSxDQUFrQixJQUFsQixDQUF1QixNQUF2QixDQUFBLENBQStCLE1BQU0sQ0FBQyxJQUF0QyxDQUFBO0lBQ1YsS0FBQSxDQUFNLENBQUEsZUFBQSxDQUFBLENBQWtCLE9BQWxCLENBQTBCLENBQTFCLENBQU4sRUFsQkE7O0lBc0JBLEtBQUEsR0FDRTtNQUFBLE9BQUEsRUFBUyxPQUFUO01BQ0EsVUFBQSxFQUFZLElBRFo7O01BS0EsTUFBQSxFQUNFO1FBQUEsR0FBQSxFQUFLLEdB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TSxLQUFBLENBQU0sS0FBTixFQTFJTjs7SUE4SUEsR0FBQSxHQUFNLENBQUEsTUFBTSxVQUNWLENBQUMsR0FEUyxDQUNMLEtBQUssQ0FBQyxHQURELENBRVYsQ0FBQyxLQUZTLENBRUgsUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUFXLENBQUE7SUFBWCxDQUZHLENBQU47SUFJTixLQUFBLENBQU0sb0JBQU4sRUFBNEIsR0FBNUI7SUFDQSxVQUFBLEdBQWE7RUFySmMsRUFUakM7Ozs7RUFvS0ksT0FBQSxHQUFVLE9BQUEsQ0FBUSxjQUFSOztFQUVWLEtBQUEsR0FBUSxRQUFBLENBQUMsT0FBRCxDQUFBO1dBQWEsSUFBSSxPQUFKLENBQVksUUFBQSxDQUFDLE9BQUQsQ0FBQTthQUFhLFVBQUEsQ0FBVyxPQUFYLEVBQW9CLE9BQXBCO0lBQWIsQ0FBWjtFQUFiOztFQUNSLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFDVCxHQUFBLEdBQU0sT0FBQSxDQUFRLEtBQVI7O0VBQ04sR0FBQSxHQUFNLE9BQUEsQ0FBUSxnQkFBUjs7RUFDTixLQUFBLEdBQVEsQ0FBQyxPQUFBLENBQVEsVUFBUixDQUFELENBQUEsQ0FBcUIsR0FBRyxDQUFDLElBQXpCO0FBMUtaIiwic291cmNlc0NvbnRlbnQiOlsiYHJlcGxpY2F0ZWBcbi0tLS0tLS0tLS0tXG5cbiAgICBkZWxheSA9IDIwMDBcblxuYHJlcGxpY2F0ZShzb3VyY2UsdGFyZ2V0LG5hbWUsZXh0ZW5zaW9ucylgOiByZXBsaWNhdGUgZGF0YWJhc2UgYG5hbWVgIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgKGFsbCBzdHJpbmdzKSBieSBjcmVhdGluZyBhIHJlcGxpY2F0aW9uIGBwdWxsYCBkb2N1bWVudCBvbiB0aGUgdGFyZ2V0LlxuQmVmb3JlIHN1Ym1pc3Npb24sIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudCBpcyBwYXNzZWQgdG8gdGhlIChvcHRpb25hbCkgYGV4dGVuc2lvbnNgIGNhbGxiYWNrLlxuUmV0dXJucyBhIFByb21pc2UuIE1ha2Ugc3VyZSB5b3UgYGNhdGNoKClgIGFueSBlcnJvcnMuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlcGxpY2F0ZSA9IChwcmVmaXhfc291cmNlLHByZWZpeF90YXJnZXQsbmFtZSxleHRlbnNpb25zX2NiKSAtPlxuXG4gICAgICByZXBsaWNhdG9yX2RiID0gXCIje3ByZWZpeF90YXJnZXR9L19yZXBsaWNhdG9yXCJcbiAgICAgIHJlcGxpY2F0b3IgPSBuZXcgQ291Y2hEQiByZXBsaWNhdG9yX2RiXG5cbkhlcmUgd2UgaGF2ZSBtdWx0aXBsZSBzb2x1dGlvbnMsIHNvIEknbGwgdGVzdCB0aGVtOlxuLSBlaXRoZXIgZGVsZXRlIGFueSBleGlzdGluZyBkb2N1bWVudCB3aXRoIHRoZSBzYW1lIG5hbWUgKHRoaXMgc2hvdWxkIGNhbmNlbCB0aGUgcmVwbGljYXRpb24sIGJhc2VkIG9uIHRoZSBDb3VjaERCIGRvY3MpLCBhbmQgcmVjcmVhdGUgYSBuZXcgb25lO1xuXG4gICAgICB1c2VfZGVsZXRlID0gdHJ1ZVxuXG4tIG9yIHVzZSBhIGRpZmZlcmVudCBJRCBmb3IgZG9jdW1lbnRzIHRoYXQgZGVzY3JpYmVzIGRpZmZlcmVudCByZXBsaWNhdGlvbnMuXG5cbiAgICAgICMgdXNlX2RlbGV0ZSA9IGZhbHNlXG5cblRoZSBvbmUgdGhpbmcgd2Uga25vdyBkb2Vzbid0IHdvcmsgaXMgdXNpbmcgdGhlIHNhbWUgZG9jdW1lbnQgSUQgZm9yIGRvY3VtZW50cyB0aGF0IGRlc2NyaWJlIGRpZmZlcmVudCByZXBsaWNhdGlvbnMgKGUuZy4gd2l0aCBkaWZmZXJlbnQgZmlsdGVyczogZXhwZXJpZW5jZSBzaG93cyB0aGUgcmVwbGljYXRvciBkb2Vzbid0IG5vdGljZSBhbmQga2VlcHMgdXNpbmcgdGhlIG9sZCBmaWx0ZXIpLlxuRGVsZXRpbmcgdGhlIHJlcGxpY2F0aW9uIGRvY3VtZW50IHNob3VsZCBhbHNvIGZvcmNlIHRoZSByZXBsaWNhdG9yIHRvIHN0b3AgdGhlIGV4aXN0aW5nIHJlcGxpY2F0aW9uIGFuZCBzdGFydCBhIG5ldyBwcm9jZXNzLlxuXG4gICAgICBzb3VyY2UgPSB1cmwucGFyc2UgcHJlZml4X3NvdXJjZVxuICAgICAgdGFyZ2V0ID0gdXJsLnBhcnNlIHByZWZpeF90YXJnZXRcbiAgICAgIGNvbW1lbnQgPSBcInJlcGxpY2F0aW9uIG9mICN7bmFtZX0gZnJvbSAje3NvdXJjZS5ob3N0fVwiXG4gICAgICBkZWJ1ZyBcIkdvaW5nIHRvIHN0YXJ0ICN7Y29tbWVudH0uXCJcblxuSSdtIGNyZWF0aW5nIGEgYG1vZGVsYCBkb2N1bWVudC4uIGp1c3QgaW4gY2FzZSBJJ2QgaGF2ZSB0byByZXZlcnQgdG8gbWFudWFsbHkgcHVzaGluZyB0byBgL19yZXBsaWNhdGVgIGJlY2F1c2UgdGhlIHJlcGxpY2F0b3IgaXMgdG9vIGJyb2tlbi4gOilcblxuICAgICAgbW9kZWwgPVxuICAgICAgICBjb21tZW50OiBjb21tZW50XG4gICAgICAgIGNvbnRpbnVvdXM6IHRydWVcblxuUmVtb3ZlIGF1dGhvcml6YXRpb24gZnJvbSB0aGUgc291cmNlIGFuZCB0YXJnZXQsIGJlY2F1c2UuLi5cblxuICAgICAgICB0YXJnZXQ6XG4gICAgICAgICAgdXJsOiB1cmwuZm9ybWF0XG4gICAgICAgICAgICBwcm90b2NvbDogdGFyZ2V0LnByb3RvY29sXG4gICAgICAgICAgICBob3N0OiB0YXJnZXQuaG9zdFxuICAgICAgICAgICAgcGF0aG5hbWU6IG5hbWVcbiAgICAgICAgc291cmNlOlxuICAgICAgICAgIHVybDogdXJsLmZvcm1hdFxuICAgICAgICAgICAgcHJvdG9jb2w6IHNvdXJjZS5wcm90b2NvbFxuICAgICAgICAgICAgaG9zdDogc291cmNlLmhvc3RcbiAgICAgICAgICAgIHBhdGhuYW1lOiBuYW1lXG5cbi4uLmV2ZW4gd2l0aCBDb3VjaERCIH5+MS42LjF+fiAyLjEuMSB3ZSBzdGlsbCBoYXZlIHRoZSBpc3N1ZSB3aXRoIENvdWNoREIgbm90IHByb3Blcmx5IG1hbmFnaW5nIGF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGEgdXNlcm5hbWUgYW5kIHBhc3N3b3JkIGFyZSBwcm92aWRlZCBpbiB0aGUgb3JpZ2luYWwgVVJJIHRoYXQgY29udGFpbnMgXCJzcGVjaWFsXCIgY2hhcmFjdGVycyAobGlrZSBgQGAgb3Igc3BhY2UpLiBTbyBsZXQncyBoYW5kbGUgaXQgb3Vyc2VsdmVzLlxuXG4gICAgICBpZiBzb3VyY2UuYXV0aD9cbiAgICAgICAgYXV0aCA9IChCdWZmZXIuZnJvbSBzb3VyY2UuYXV0aCkudG9TdHJpbmcgJ2Jhc2U2NCdcbiAgICAgICAgZGVidWcgXCJFbmNvZGVkIGAje3NvdXJjZS5hdXRofWAgb2YgYCN7cHJlZml4X3NvdXJjZX1gIGFzIGAje2F1dGh9YC5cIlxuICAgICAgICBtb2RlbC5zb3VyY2UuaGVhZGVycyA9XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogXCJCYXNpYyAje2F1dGh9XCJcblxuICAgICAgaWYgdGFyZ2V0LmF1dGg/XG4gICAgICAgIGF1dGggPSAoQnVmZmVyLmZyb20gdGFyZ2V0LmF1dGgpLnRvU3RyaW5nICdiYXNlNjQnXG4gICAgICAgIGRlYnVnIFwiRW5jb2RlZCBgI3t0YXJnZXQuYXV0aH1gIG9mIGAje3ByZWZpeF90YXJnZXR9YCBhcyBgI3thdXRofWAuXCJcbiAgICAgICAgbW9kZWwudGFyZ2V0LmhlYWRlcnMgPVxuICAgICAgICAgIEF1dGhvcml6YXRpb246IFwiQmFzaWMgI3thdXRofVwiXG5cbkxldCB0aGUgY2FsbGJhY2sgYWRkIGFueSBmaWVsZCB0aGV5J2QgbGlrZS5cbk5vdGU6IHRoZSBjYWxsYmFjayBtaWdodCBhbHNvIHByZXZlbnQgcmVwbGljYXRpb24gaWYgaXQgdGhyb3dzLiBUaGlzIGlzIGludGVudGlvbmFsLlxuTm90ZTogdGhlIGNhbGxiYWNrIG1pZ2h0IHJldHVybiBhIFByb21pc2UuIE9yIG5vdC4gV2UnbGwgZGVhbCB3aXRoIGJvdGguXG5cbiAgICAgIGF3YWl0IGV4dGVuc2lvbnNfY2I/IG1vZGVsXG5cbkNyZWF0ZSBhIChzb21ld2hhdCkgdW5pcXVlIElEIGZvciB0aGUgZG9jdW1lbnQuXG5cbiAgICAgIHN1bSA9IGNyeXB0by5jcmVhdGVIYXNoICdzaGEyNTYnXG4gICAgICBzdW0udXBkYXRlIEpTT04uc3RyaW5naWZ5IG1vZGVsXG4gICAgICBpZCA9IHN1bS5kaWdlc3QgJ2hleCdcbiAgICAgIG1vZGVsLmNvbW1lbnRfaWQgPSBpZFxuXG5XaGVuIGRlbGV0aW5nLCB3ZSBjYW4gdXNlIHRoZSBgY29tbWVudGAgdmFsdWUgc2luY2UgaXQgZG9lc24ndCBoYXZlIHRvIGJlIHVuaXF1ZSBldmVuIGlmIHdlIGNoYW5nZSB0aGUgcmVjb3JkLlxuV2hlbiBjcmVhdGluZyBkb2N1bWVudHMgd2l0aCBkaWZmZXJlbnQgSURzLCB3ZWxsLCB1c2UgdGhlIGNvbXB1dGVkIElELlxuXG4gICAgICBtb2RlbC5faWQgPSBpZiB1c2VfZGVsZXRlIHRoZW4gbW9kZWwuY29tbWVudCBlbHNlIGlkXG5cbkxldCdzIGdldCBzdGFydGVkLlxuXG4gICAgICBkZWJ1ZyBcIkdvaW5nIHRvIGluamVjdFwiLCBtb2RlbFxuXG5DcmVhdGUgdGhlIHRhcmdldCBkYXRhYmFzZSBpZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3QuXG5cbiAgICAgIHRhcmdldCA9IG5ldyBDb3VjaERCIFwiI3twcmVmaXhfdGFyZ2V0fS8je25hbWV9XCJcbiAgICAgIGF3YWl0IHRhcmdldC5jcmVhdGUoKVxuICAgICAgICAuY2F0Y2ggKGVycm9yKSAtPlxuICAgICAgICAgIGRlYnVnLmVycm9yIFwiY3JlYXRlICN7bmFtZX1cIiwgZXJyb3JcblxuQ2F0Y2ggNDEyIGVycm9ycyBhcyB0aGV5IGluZGljYXRlIHRoZSBkYXRhYmFzZSBlYXJseSBleGlzdHMuXG5cbiAgICAgICAgICBpZiBlcnJvci5zdGF0dXM/IGFuZCBlcnJvci5zdGF0dXMgaXMgNDEyXG4gICAgICAgICAgICBkZWJ1ZyBcIkRhdGFiYXNlIGFscmVhZHkgZXhpc3RzXCJcbiAgICAgICAgICAgIHJldHVyblxuXG5SZXBvcnQgYWxsIG90aGVyIGVycm9ycy5cblxuICAgICAgICAgIGRlYnVnLmVycm9yIFwiQ3JlYXRpbmcgZGF0YWJhc2UgI3tuYW1lfSBmYWlsZWQuXCIsIGVycm9yXG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QgZXJyb3JcblxuICAgICAgdGFyZ2V0ID0gbnVsbFxuXG5XaGVuIHVzaW5nIHRoZSBkZWxldGlvbiBtZXRob2QsIGZpcnN0IGRlbGV0ZSB0aGUgZXhpc3RpbmcgcmVwbGljYXRpb24gZG9jdW1lbnQuXG5cbiAgICAgIGlmIHVzZV9kZWxldGVcbiAgICAgICAge19yZXZ9ID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAgIC5nZXQgbW9kZWwuX2lkXG4gICAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cbiAgICAgICAgYXdhaXQgcmVwbGljYXRvci5kZWxldGUgaWQ6bW9kZWwuX2lkLCByZXY6X3JldiBpZiBfcmV2P1xuXG5HaXZlIENvdWNoREIgc29tZSB0aW1lIHRvIGJyZWF0aC5cblxuICAgICAgYXdhaXQgc2xlZXAgZGVsYXlcblxuVXBkYXRlIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudC5cblxuICAgICAge19yZXZ9ID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAuZ2V0IG1vZGVsLl9pZFxuICAgICAgICAuY2F0Y2ggKGVycm9yKSAtPiB7fVxuXG4gICAgICBkb2MgPSB7fVxuICAgICAgZG9jLl9yZXYgPSBfcmV2IGlmIF9yZXY/XG4gICAgICBmb3Igb3duIGssdiBvZiBtb2RlbFxuICAgICAgICBkb2Nba10gPSB2XG5cbiAgICAgIGRlYnVnICdDcmVhdGluZyByZXBsaWNhdGlvbicsIGRvY1xuXG4gICAgICBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC5wdXQgZG9jXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+XG4gICAgICAgICAgZGVidWcuZXJyb3IgXCJwdXQgI3ttb2RlbC5faWR9XCIsIGVycm9yXG5cbkNhdGNoIDQwMyBlcnJvcnMgYXMgdGhleSBpbmRpY2F0ZSB0aGUgc3RhdHVzIHdhcyB1cGRhdGVkIGJ5IENvdWNoREIgKHRvbyBmYXN0IGZvciB1cyB0byBzZWUpLlxuXG4gICAgICAgICAgaWYgZXJyb3Iuc3RhdHVzPyBhbmQgZXJyb3Iuc3RhdHVzIGlzIDQwM1xuICAgICAgICAgICAgZGVidWcgXCJSZXBsaWNhdGlvbiBhbHJlYWR5IHN0YXJ0ZWRcIlxuICAgICAgICAgICAgcmV0dXJuXG5cblJlcG9ydCBhbGwgb3RoZXIgZXJyb3JzLlxuXG4gICAgICAgICAgZGVidWcuZXJyb3IgXCJSZXBsaWNhdGlvbiBmcm9tICN7bW9kZWwuc291cmNlfSBmYWlsZWQuXCIsIGVycm9yXG4gICAgICAgICAgUHJvbWlzZS5yZWplY3QgZXJyb3JcblxuR2l2ZSBDb3VjaERCIHNvbWUgdGltZSB0byBicmVhdGguXG5cbiAgICAgIGF3YWl0IHNsZWVwIGRlbGF5XG5cbkxvZyB0aGUgc3RhdHVzIG9mIHRoZSByZXBsaWNhdG9yXG5cbiAgICAgIGRvYyA9IGF3YWl0IHJlcGxpY2F0b3JcbiAgICAgICAgLmdldCBtb2RlbC5faWRcbiAgICAgICAgLmNhdGNoIChlcnJvcikgLT4ge31cblxuICAgICAgZGVidWcgJ1JlcGxpY2F0aW9uIHN0YXR1cycsIGRvY1xuICAgICAgcmVwbGljYXRvciA9IG51bGxcbiAgICAgIHJldHVyblxuXG5Ub29sYm94XG49PT09PT09XG5cbiAgICBDb3VjaERCID0gcmVxdWlyZSAnbW9zdC1jb3VjaGRiJ1xuXG4gICAgc2xlZXAgPSAodGltZW91dCkgLT4gbmV3IFByb21pc2UgKHJlc29sdmUpIC0+IHNldFRpbWVvdXQgcmVzb2x2ZSwgdGltZW91dFxuICAgIGNyeXB0byA9IHJlcXVpcmUgJ2NyeXB0bydcbiAgICB1cmwgPSByZXF1aXJlICd1cmwnXG4gICAgcGtnID0gcmVxdWlyZSAnLi9wYWNrYWdlLmpzb24nXG4gICAgZGVidWcgPSAocmVxdWlyZSAndGFuZ2libGUnKSBwa2cubmFtZVxuIl19
//# sourceURL=/dev/shm/frantic-team/index.coffee.md