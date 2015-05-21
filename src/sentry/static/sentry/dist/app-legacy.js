/*global jQuery:true*/

if (Sentry === undefined) {
    var Sentry = {};
}

(function(app, jQuery){
    "use strict";

    var $ = jQuery;

    $(document).ajaxSend(function(event, xhr, settings) {
        function getCookie(name) {
            var cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                var cookies = document.cookie.split(';');
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = jQuery.trim(cookies[i]);
                    // Does this cookie string begin with the name we want?
                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        function sameOrigin(url) {
            // url could be relative or scheme relative or absolute
            var host = document.location.host; // host + port
            var protocol = document.location.protocol;
            var sr_origin = '//' + host;
            var origin = protocol + sr_origin;
            // Allow absolute or scheme relative URLs to same origin
            return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
                (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
                // or any other URL that isn't scheme relative or absolute i.e relative.
                !(/^(\/\/|http:|https:).*/.test(url));
        }
        function safeMethod(method) {
            return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
        }

        if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });

    $(function(){
        $('.popup').on('click', function(){
            var $this = $(this);
            var $window = $(window);
            var $container = $($this.attr('data-container'));
            var title = $this.attr('data-title') || 'Untitled';
            var content = $container.html();
            var height = Math.min($window.height() - 100, $container.height() + 40);
            var width = Math.min($window.width() - 100, $container.width() + 40);
            var w = window.open("about:blank", "dsqApiExpand", "toolbar=0,status=0,location=0,menubar=0,height=" + height + ",width=" + width);
            w.document.write("<!DOCTYPE html><html>" +
                "<head>" +
                    "<title>" + title + "</title>" +
                    "<link href=\"" + app.config.popupCss + "\" rel=\"stylesheet\" type=\"text/css\"/>" +
                "</head><body>" +
                    "<div id=\"popup\">" + content + "</div></body>" +
                "</html>");
        });
    });

}(app, jQuery));

if (Sentry === undefined) {
    var Sentry = {};
}
(function(jQuery, moment){
    "use strict";

    var $ = jQuery;

    var average = function(a) {
        var r = {mean: 0, variance: 0, deviation: 0}, t = a.length;
        for (var m, s = 0, l = t; l--; s += a[l]);
        for (m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2));
        r.deviation = Math.sqrt(r.variance = s / t);
        return r;
    };

    var percentile = function(a, nth) {
        a = a.sort();
        a.slice(0, a.length - Math.floor(nth / a.length));
        return average(a);
    };

    var timeUnitSize = {
        "second": 1000,
        "minute": 60 * 1000,
        "hour": 60 * 60 * 1000,
        "day": 24 * 60 * 60 * 1000,
        "month": 30 * 24 * 60 * 60 * 1000,
        "quarter": 3 * 30 * 24 * 60 * 60 * 1000,
        "year": 365.2425 * 24 * 60 * 60 * 1000
    };

    var tickFormatter = function (value, axis) {
        var d = moment(value);

        var t = axis.tickSize[0] * timeUnitSize[axis.tickSize[1]];
        var span = axis.max - axis.min;
        var fmt;

        if (t < timeUnitSize.minute) {
            fmt = 'LT';
        } else if (t < timeUnitSize.day) {
            fmt = 'LT';
            if (span < 2 * timeUnitSize.day) {
                fmt = 'LT';
            } else {
                fmt = 'MMM D LT';
            }
        } else if (t < timeUnitSize.month) {
            fmt = 'MMM D';
        } else if (t < timeUnitSize.year) {
            if (span < timeUnitSize.year) {
                fmt = 'MMM';
            } else {
                fmt = 'MMM YY';
            }
        } else {
            fmt = 'YY';
        }

        return d.format(fmt);
    };

    Sentry.charts = {};
    Sentry.charts.tickFormatter = tickFormatter;
    Sentry.charts.render = function(el){
        var $sparkline = $(el);

        if ($sparkline.length < 1) {
            return; // Supress an empty chart
        }

        $.ajax({
            url: $sparkline.attr('data-api-url'),
            type: 'get',
            dataType: 'json',
            data: {
                since: new Date().getTime() / 1000 - 3600 * 24 * 7,
                resolution: '1h'
            },
            success: function(data){
                var inputs = [], avg, i, data_avg = [], p_95th;
                for (i = 0; i < data.length; i++) {
                    inputs.push(data[i][1]);

                    // set timestamp to be in millis
                    data[i][0] = data[i][0] * 1000;
                }
                p_95th = percentile(inputs);

                for (i = 0; i < data.length; i++) {
                    data_avg.push([data[i][0], p_95th.mean]);
                }

                var points = [
                    {
                        data: data,
                        color: 'rgba(86, 175, 232, 1)',
                        shadowSize: 0,
                        lines: {
                            lineWidth: 2,
                            show: true,
                            fill: false
                        }
                    },
                    {
                        data: data_avg,
                        color: 'rgba(244, 63, 32, .4)',
                        // color: '#000000',
                        shadowSize: 0,
                        dashes: {
                            lineWidth: 2,
                            show: true,
                            fill: false
                        }
                    }
                ];
                var options = {
                    xaxis: {
                       mode: "time",
                       tickFormatter: tickFormatter
                    },
                    yaxis: {
                       min: 0,
                       tickFormatter: function(value) {
                            if (value > 999999) {
                                return (value / 1000000) + 'mm';
                            }
                            if (value > 999) {
                                return (value / 1000) + 'k';
                            }
                            return value;
                       }
                    },
                    tooltip: true,
                    tooltipOpts: {
                        content: function(label, xval, yval, flotItem) {
                            if(typeof yval.toLocaleString == "function") {
                                return yval.toLocaleString() + ' events<br>' + moment(xval).format('llll');
                            }
                            return yval + ' events<br>' + moment(xval).format('llll');
                        },
                        defaultTheme: false
                    },
                    grid: {
                        show: true,
                        hoverable: true,
                        backgroundColor: '#ffffff',
                        borderColor: '#DEE3E9',
                        borderWidth: 2,
                        tickColor: '#DEE3E9'
                    },
                    hoverable: false,
                    legend: {
                        noColumns: 5
                    },
                    lines: { show: false }
                };

                $.plot($sparkline, points, options);

                $(window).resize(function(){
                    $.plot($sparkline, points, options);
                });

            }

        });
    };
}(jQuery, moment));

/*jshint browser:true */

if (Sentry === undefined) {
    var Sentry = {};
}
(function(app, jQuery){
    "use strict";

    var $ = jQuery;

    Sentry.stream = {};
    Sentry.stream.clear = function() {
        if (window.confirm("Are you sure you want to mark all your stream as resolved?")) {
            $.ajax({
                url: app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/clear/',
                type: 'post',
                dataType: 'json',
                success: function(groups){
                    window.location.reload();
                }
            });
        }
    };
    Sentry.stream.resolve = function(gid, remove){
        if (typeof(remove) == 'undefined') {
            remove = true;
        }
        $.ajax({
            url: app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/resolve/',
            type: 'post',
            dataType: 'json',
            data: {
                gid: gid
            },
            success: function(groups){
                for (var i=groups.length-1, data, row; (data=groups[i]); i--) {
                    $('.event[data-group="' + data.id + '"]').remove();
                    if (!remove) {
                        $('#event_list').prepend(data.html);
                        $('.event[data-group="' + data.id + '"]').addClass('fresh');
                    }
                }
            }
        });
    };
    Sentry.stream.bookmark = function(project_id, gid, el){
        $.ajax({
            url: app.config.urlPrefix + '/api/' + app.config.organizationId + '/' + app.config.projectId + '/bookmark/',
            type: 'post',
            dataType: 'json',
            data: {
                gid: gid
            },
            success: function(data){
                if (!el) {
                    return;
                }
                var $el = $(el);
                if (data.bookmarked) {
                    $el.addClass('checked');
                } else {
                    $el.removeClass('checked');
                }
            }
        });
    };
}(app, jQuery));
