/*!
* @license Copyright 2014 Chris Antaki. MIT License: http://en.wikipedia.org/wiki/MIT_License
*/

;(function ($) {
    var templates = {};

    function jQueryDotTemplate (target, values, wrapper) {
        if (!templates[target]) {
            templates[target] = $(target).html();
        }

        if (wrapper == null) wrapper = "div";
        var $html = $('<' + wrapper + '>' + templates[target] + '</' + wrapper + '>');

        for (var i in values) {
            $html.find('.class-' + i).addClass(values[i]);
            $html.find('.href-' + i).attr('href', values[i]);
            $html.find('.src-' + i).attr('src', values[i]);
            $html.find('.target-' + i).attr('target', values[i]);
            $html.find('.text-' + i).text(values[i]);
            $html.find('.data-' + i).attr('data-' + i, values[i]);
            $html.find('.id-' + i).attr('id', values[i]);
            $html.find('.value-' + i).attr('value', values[i]);
            $html.find('.alt-' + i).attr('alt', values[i]);
            $html.find('.title-' + i).attr('title', values[i]);			
            $html.find('.style-' + i).attr('style', values[i]);
        }

        return $html.children();
    }

    $.template = jQueryDotTemplate;
})(jQuery);
