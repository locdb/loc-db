'use strict';
const BibliographicResource = require('./../schema/bibliographicResource');
const logger = require('./../util/logger');
const enums = require('./../schema/enum.json');
const mongoBrSuggestions = require('./../models/bibliographicResourceSuggestions').mongoBrSuggestions;
const mongoBr= require('./../models/bibliographicResource').mongoBr;
const _ = require('underscore');

var StatsHelper = function(){
};

StatsHelper.prototype.groupBy = function(collection, property) {
    var i = 0, val, index,
        values = [], result = [];
    for (; i < collection.length; i++) {
        val = collection[i][property];
        index = values.indexOf(val);
        if (index > -1)
            result[index].push(collection[i]);
        else {
            values.push(val);
            result.push([collection[i]]);
        }
    }
    return result;
};

StatsHelper.prototype.brStats = function(callback){
    var self = this;
    var stats = {};
    mongoBr.find({},{},function(err,docs){
        if(err){
            logger.error(err);
            return callback(err, null);
        }
        stats.total = docs.length;
        var typeGroups = self.groupBy(docs, "type");
        var identifiers = [];
        for(var br of docs){
            var helper = new BibliographicResource(br);
            var helperTypes = helper.getAllTypesOfThis();
            for(var t of helperTypes){
                var identifiers = identifiers.concat(helper.getIdentifiersForType(t));
            }
        }
        var identifierGroups = self.groupBy(identifiers, "scheme");
        stats.types = {};
        stats.identifiers = {};
        stats.identifiers.total = identifiers.length;
        for(var tg of typeGroups){
            stats.types[tg[0].type] = tg.length;
        }
        for(var ig of identifierGroups){
            stats.identifiers[ig[0].scheme] = ig.length;
        }
        return callback(null, stats);
    });
};

StatsHelper.prototype.logStats = function(callback){
    var self = this;
    var stats = {};
    // last factor is number of days?
    var startDate = new Date() - (24 * 60 * 60 * 1000 * 20);
    logger.query({level: 'info', from: startDate, until: new Date(), fields: ['message'], start: 0, limit: 1000},function(err, results){
        return callback(null, results);
    });

    // read log
    // filter log according to old stats script
};


/**
 Find's the index of an event. Expects `key` to be either callable to
 evaluate on each event or a (string) value to which the `msg` property of
 the event is compared. The return value -1 means that no match was found.
 **/
StatsHelper.prototype.event_index = function(events, key, start=0) {
    for (let i in _.range(start, events.length)) {
        let event = events[i];
        if (_.isFunction(key)) {
            if (key(event)) {
                return i;
            }
        } else {
            if (event["msg"] == key) {
                return i;
            }
        }
    }
    return -1;
};


/**
 Finds the first indices of start_msg and end_msg respectively and
 computes the timespan in between
 */
StatsHelper.prototype.process_reference = function(timed_events, key_start='SEARCH ISSUED', key_end='COMMIT PRESSED'){
    let self = this;
    // TODO: The zipping is probably wrong
    let zipped_events = _.zip(...timed_events);
    let times, events = zipped_events;

    let start = self.event_index(events, key_start);
    let end = self.event_index(events, key_end);

    let span = times[end] - times[start];

    return span;
};


/**
 Given a list of timed events, find multiple timedeltas matching criterion.
 Does not check, whether the end event actually fits to the start event
 (e.g. having same resource id), this can be done via grouping before.
 **/
StatsHelper.prototype.paired_times = function(timed_events, criterion){
    let key_start = criterion[0],
        key_end = criterion[1],
        self = this;
    // TODO: Here I really need to figure out what is happening
    let times, events = _.zip(...timed_events);
    let captured_times = [];
    let current = 0;
    while(current < events.length){
        let start = self.event_index(events, key_start, current);
        let end = self.event_index(events, key_end, start + 1);
        if(start == -1 || end == -1){
            break;
        }
        let diff = times[end] - times[start];
        captured_times.append(diff);
        current = end + 1;
    }
    return captured_times
};


/**
 Filters the reference items for validity, then computes the time span
 for each reference and returns the mean time
 **/
StatsHelper.prototype.filter_groups = function(entry_groups, criterion=['SEARCH ISSUED', 'COMMIT PRESSED'], should_contain=[], sanity_interval=null){
    let key_start = criterion[0],
        key_end = criterion[1],
        self = this;
    /** Returns true, iff entry_group is valid **/
    function is_valid(ref){
        // TODO: How to do that
        let times, events = _.zip(...ref);

        let start = self.event_index(events, key_start);
        let end = self.event_index(events, key_end);
        for(let key in should_contain){
            let is_in = self.event_index(events, key);
            if(is_in == -1){
                return false;
            }
        }

        let diff = times[end] - times[start];
       /* if(sanity_interval && diff > timedelta(seconds=sanity_interval)){
            //sanity check, maximum seconds for a single citation
            //(defaults to 15 minutes)
            return false;
        }*/
        if(diff < timedelta()){
            return false;
        }
        return true;
    }

    // First validity checks, such that invalid groups do not contribute to mean
    let valid_groups = entry_groups.filter(is_valid);
    return valid_groups;

};


/**
 * Computes basic statistics of the timespans
 * @param timespans
 */
StatsHelper.prototype.compute_stats = function(timespans){
    let n_samples = timespans.length;
    let interval = [Math.min.apply(null, timespans), Math.max.apply(null, timespans)];

    let mean = timespans.reduce(function(pv, cv) { return pv + cv; }, 0) / n_samples;

    let sorted_values = timespans.sort();

    let quantiles = {'25': sorted_values[Math.round(n_samples * .25)],
        '50': sorted_values[Math.round(n_samples * .50)],
        '75': sorted_values[Math.round(n_samples * .75)]};

    return {n_samples: n_samples, interval: interval, quantiles: quantiles, mean: mean};
};


/**
Counts the number of occurences of matching events in each event group
*/
StatsHelper.prototype.eval_count = function(event_groups, criterion, name, prefix_dir='results'){
    function satisfies(event){
        // Returns True iff criterion is satisfied (either funct or str)
        return _.isFunction(criterion) ? criterion(event) : event['msg'] == criterion;
    }

    let counts = [];
    for(let es of event_groups){
        let zipped_es =
        counts.push
    }
/*    counts = [len(list(filter(satisfies, list(zip(*es))[1]))) for es in
        event_groups]

    print("\n## Count Criterion: ", name + "\n")
    print("\n```")
    stats = compute_stats(counts)
    print_stats(*stats)
    print("```\n")
    os.makedirs(prefix_dir, exist_ok=True)
    prefix = os.path.join(prefix_dir, name.lower().replace(' ', '-'))
    print("Writing results to", prefix + '*', file=sys.stderr)
    with open(prefix+'_distribution.txt', 'w') as fhandle:
    print(*sorted(Counter(counts).items(), key=itemgetter(0)), sep='\n',
        file=fhandle)
    with open(prefix+'_counts.txt', 'w') as fhandle:
    print(*counts, sep='\n', file=fhandle)
    with open(prefix+'_results.txt', 'w') as fhandle:
    print_stats(*stats, file=fhandle)*/
}



/**
Args
===
event groups : list of list of timed events[[(time, event)]]
criterion: pair of start and end condition (callable, callable) or (str, str)
name: identifer used for storage and reporting
**/
StatsHelper.prototype.eval_span = function(event_groups, criterion, name, callback){
    let self = this;
    let key_start = criterion[0];
    let key_end = criterion[1];
    let timespans = [];
    for(let g of event_groups){
        let timespan = self.process_reference(g, key_start, key_end).total_seconds();
        timespans.push(timespan);
    }

    console.log("\n## Span Criterion: " + name + "\n")
    console.log("\n```")
    return callback(null, self.compute_stats(timespans));
};


/**
Given a list of timed events [(time, event)] find paired events that match
criterion and compute basic statistics plus draw plots.
**/
StatsHelper.prototype.eval_multi_spans = function(events, criterion, name, sanity_interval){
    let self = this;
    let timespans = self.paired_times(events, criterion);
    let timespans_processed = [];
    for(let t of timespans){
        timespans_processed.push(t.total_seconds());
    }
    let timespans_filtered = [];
    if(sanity_interval > -1){
        for(let t of timespans_processed){
            if(t < sanity_interval){
                timespans_filtered.push(t);
            }
        }
    }else{
        timespans_filtered = timespans_processed;
    }

    console.log("\n## Multi-Span Criterion: " + name + "\n");
    console.log("Sanity interval: " + sanity_interval);
    console.log("\n```")
    return callback(null, self.compute_stats(timespans_filtered));
};







/**
 * Factory function
 *
 * @returns {StatsHelper}
 */
function createStatsHelper() {
    return new StatsHelper();
}


module.exports = {
    createStatsHelper : createStatsHelper
};