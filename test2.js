/**
 * @var $ JQuery()
 */

/**
 * @type {boolean}
 */
var handlingIt = false;

/**
 * @type {boolean}
 */
var started = false;

var IS_FEEDBACK_MODE = false;

function initContextMenu() {
    $.contextMenu({
        selector: '#page-content',
        items: {
            highlight: {name: "Highlight", icon: "highlight", callback: highlightSelection},
            note: {name: "Notes", icon: "edit", callback: highlightSelection},
            clear: {
                name: "Clear",
                icon: "clear",
                disabled: true,
                callback: clearThisHighlight,
                title: "Clears this highlighting"
            },
            clearAll: {
                name: "Clear all",
                icon: "clearAll",
                disabled: true,
                callback: clearAllHighlight,
                title: "Clears all highlighting on this page"
            }
        },
        events: {
            show: checkSelection
        }
    });

    var highlighter;

    var initialDoc;


    let highlightClass = 'highlighted';

    rangy.init();

    var CssApplier, store = {},
        Ranges = [], RangesOrder = [], savedRanges = {},
        savedNotes = {}, NotesOptions = {},
        Screen = {}, screenId;

    CssApplier = rangy.createClassApplier(highlightClass, {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
    });

    Screen.notes = {};
    Screen.textAreaSelection = null;
    Screen.mainSelector = '#page-content';


    function highlightSelection(action, opt) {
        var str, $note, key = makeid(),
            range, rangeCheck, rkey;

        if (Screen.sel.rangeCount === 0 || Screen.sel.isCollapsed) {
            rkey = getContextualRange(Screen.crntTarget);
            range = Ranges[rkey];
        } else {
            range = Screen.sel.getRangeAt(0);
        }

        rangeCheck = checkHighlightedRanges(range);
        if (rangeCheck) {
            if (rangeCheck.update) {
                CssApplier.applyToRange(range);
                Ranges[rangeCheck.overlap] = range;
                checkRangesOrdering(rangeCheck.overlap);
            }

            if (action === "note") {
                str = range.toString();
                if (Screen.notes[rangeCheck.overlap]) {
                    $note = $(Screen.notes[rangeCheck.overlap].note);
                    if (rangeCheck.update) {
                        $note.find('.' + highlightClass).text(str);
                    }
                    $note.fadeIn();
                } else {
                    Screen.notes[rangeCheck.overlap] = newNote(str, opt.$menu.offset());
                }
            }
        } else {
            CssApplier.applyToRange(range);
            Ranges[key] = range;
            checkRangesOrdering(key);

            if (action === "note") {
                str = range.toString();
                Screen.notes[key] = newNote(str, opt.$menu.offset());
            }
        }
        Screen.sel.collapseToEnd();
    }

    function clearThisHighlight() {
        var key, pos;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key)) {
                var trgtRng = Ranges[key];
                if (rangeIntersectsNode(trgtRng, Screen.crntTarget)) {
                    CssApplier.undoToRange(trgtRng);
                    if (Screen.notes[key]) {
                        $(Screen.notes[key].note).remove();
                        delete Screen.notes[key];
                    }
                    delete Ranges[key];
                    pos = RangesOrder.indexOf(key);
                    RangesOrder.splice(pos, 1);
                    break;
                }
            }
        }
    }

    function clearAllHighlight() {
        var key, pos;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key)) {
                var trgtRng = Ranges[key];
                if ($(trgtRng.startContainer).parent().closest('#page-content').length > 0) {
                    CssApplier.undoToRange(trgtRng);
                    if (Screen.notes[key]) {
                        $(Screen.notes[key].note).remove();
                        delete Screen.notes[key];
                    }
                    delete Ranges[key];
                    pos = RangesOrder.indexOf(key);
                    RangesOrder.splice(pos, 1);
                }
            }
        }
    }

    function newNote(txt, pos) {
        var note = new Note(NotesOptions);
        note.id = ++highestId;
        if (pos) {
            note.left = pos.left + "px";
            note.top = pos.top + "px";
        } else {
            note.left = '80%';
            note.top = '60px';
        }
        note.zIndex = ++highestZ;

        if (txt && NotesOptions.highlightText) {
            note.hText = txt;
        }
        return note;
    }

    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * @param sel
     * @returns {boolean}
     */
    function checkValidSelection(sel) {
        var range = sel.getRangeAt(0);
        return ($(range.startContainer.parentNode).closest('#page-content').length > 0) &&
            ($(range.endContainer.parentNode).closest('#page-content').length > 0);
    }

    /**
     * @param opt
     * @returns {boolean}
     */
    function checkSelection(opt) {
        Screen.sel = rangy.getSelection();
        var selContent = Screen.sel.toHtml();

        if (Screen.sel.rangeCount === 0 || Screen.sel.isCollapsed) {
            opt.items.highlight.disabled = true;
            if ($(Screen.crntTarget).is('.highlighted')) {
                opt.items.note.disabled = false;
                opt.items.clear.disabled = false;
                if (true) {
                    opt.items.clearAll.disabled = false;
                }
            } else {
                opt.items.note.disabled = true;
                opt.items.clear.disabled = true;
                if (true) {
                    opt.items.clearAll.disabled = true;
                }
            }
        } else {
            if (checkValidSelection(Screen.sel)) {
                opt.items.highlight.disabled = false;
                opt.items.note.disabled = false;
            } else {
                opt.items.highlight.disabled = true;
                opt.items.note.disabled = true;
            }
            opt.items.clear.disabled = true;
            if (true) {
                opt.items.clearAll.disabled = true;
            }
        }
        if ((opt.items.highlight.disabled && opt.items.note.disabled && opt.items.clear.disabled) || ((opt.items.highlight.disabled && opt.items.note.disabled && opt.items.clear.disabled && opt.items.clearAll.disabled))) {
            opt.$menu.addClass('hidden');
        } else {
            opt.$menu.removeClass('hidden');
        }
    }

    function checkRangeOverlap(focalRange, testRange) {
        var extremetiesOK = focalRange.compareBoundaryPoints(Range.END_TO_START, testRange) === -1;
        var overlapAreaOK = focalRange.compareBoundaryPoints(Range.START_TO_END, testRange) === 1;
        return extremetiesOK && overlapAreaOK;
    }

    function checkHighlightedRanges(selRange) {
        var key, crntRange, startInRange, endInRange, check = false;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key)) {
                crntRange = Ranges[key];
                if (checkRangeOverlap(selRange, crntRange)) {
                    check = {overlap: key};
                    startInRange = crntRange.isPointInRange(selRange.startContainer, selRange.startOffset);
                    endInRange = crntRange.isPointInRange(selRange.endContainer, selRange.endOffset);
                    if (!startInRange || !endInRange) {
                        if (startInRange) {
                            selRange.setStart(crntRange.startContainer, crntRange.startOffset);
                        }
                        if (endInRange) {
                            selRange.setEnd(crntRange.endContainer, crntRange.endOffset);
                        }
                        delete Ranges[key];
                        if (Screen.notes[key]) {
                            delete Screen.notes[key];
                        }
                        check.update = true;
                    } else {
                        selRange = crntRange;
                        check.update = false;
                    }
                }
            }
        }
        return check;
    }

    function checkRangesOrdering(crntkey) {
        var focalRange = Ranges[crntkey],
            reordered = false, trgtRange, key, pos, focalpos;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key) && key !== crntkey) {
                trgtRange = Ranges[key];
                pos = RangesOrder.indexOf(key);
                if ((!focalpos || (focalpos > pos)) &&
                    (trgtRange.startContainer.parentNode.parentNode === focalRange.startContainer.parentNode.parentNode ||
                        trgtRange.startContainer.parentNode.parentNode === focalRange.endContainer.parentNode.parentNode) &&
                    focalRange.compareBoundaryPoints(Range.START_TO_END, trgtRange) === -1) {
                    RangesOrder.splice(pos, 0, crntkey);
                    focalpos = pos;
                    reordered = true;
                }
            }
        }
        if (!reordered) {
            RangesOrder.push(crntkey);
        }
    }

    function rangeIntersectsNode(range, node) {
        var nodeRange = node.ownerDocument.createRange();
        try {
            nodeRange.selectNode(node);
        } catch (e) {
            nodeRange.selectNodeContents(node);
        }
        return checkRangeOverlap(range, nodeRange);
    }

    function getContextualRange1(testRange) {
        var key, trgtRng;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key)) {
                trgtRng = Ranges[key];
                if (trgtRng.isPointInRange(testRange.startContainer, testRange.startOffset)) {
                    return key;
                }
            }
        }
        return false;
    }

    function getContextualRange(node) {
        var key, trgtRng;
        for (key in Ranges) {
            if (Ranges.hasOwnProperty(key)) {
                trgtRng = Ranges[key];
                if (rangeIntersectsNode(trgtRng, node)) {
                    return key;
                }
            }
        }
        return false;
    }


    CssApplier = rangy.createClassApplier(highlightClass, {
        ignoreWhiteSpace: true,
        tagNames: ["span", "a"]
    });

    $('#page-content').on('mousedown', function (e) {
        var target, interactions, respId,
            fadeMaybe = false,
            regexp = /#\w+-\w+-\w+-\w+/,
            activeItemBody = $('div[connect\\:class="itemBody activeItem"]');

        Screen.crntTarget = e.target;
        target = $(e.target);

        if (!target.is('.note') || target.parents('.note').length === 0) {
            $('div.note:visible').fadeOut(250);
        }
    });

    $('#page-content').on('mouseup', '.' + highlightClass, function (event) {
        if (event.which === 1) {
            var rkey = getContextualRange(Screen.crntTarget);
            if (rkey && Screen.notes[rkey]) {
                $(Screen.notes[rkey].note).fadeIn();
            }
        }
    });

    $('#page-content').on('mouseover', '.' + highlightClass, function (event) {

        var htext = event.target,
            rkey = getContextualRange(htext),
            notes = $(htext).find('span.notesIcon');
        if (rkey && Screen.notes[rkey]) {
            if (notes.length === 0) {
                $(htext).prepend('<span class="notesIcon"></span>');
            } else {
                notes.show();
            }
        }
    });

    $('#page-content').on('mouseleave', '.' + highlightClass, function (event) {
        var htext = event.target,
            rkey = getContextualRange(htext);
        if (rkey && Screen.notes[rkey]) {
            $(htext).find('span.notesIcon').hide();
        }
    });

    $('#page-content').on('mouseout', '.notesIcon', function (event) {
        $(this).hide();
    });

    NotesOptions.highlightText = true;
}

