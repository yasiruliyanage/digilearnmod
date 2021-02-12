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

(function () {

  if ( typeof window.CustomEvent === "function" ) return false;

  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }

  window.CustomEvent = CustomEvent;
})();
(function () {
    IS_FEEDBACK_MODE = $(".feedback").length > 0;

    if (!IS_FEEDBACK_MODE) {
        $('input[type=text]').val('');
        $('textarea').val('');
        $('input[type="radio"]').prop("checked", false);
    }

    if (!$("#test").length) {
        return;
    }

    $("input.answer[type='text'], input.answer[type='radio'], .question-buttons button, .question-text").on('keyup blur click tap', highlightAnswer);

    $("input.answer[type='text'], input.answer[type='radio']").on('keyup blur click tap', handleAnswer);
    $(".question-navigation .arrows button").on('click tap', handleArrows);
    $(window).on('questionNavigation questionHighlight', toggleArrows);


    $(".question-buttons button").on('click tap', navigateAnswer);

    $("button.review").on('tap click', markReview);
    $(window).on('questionNavigation questionHighlight', markReview);

    $(window).on('questionNavigation questionHighlight', updateInfo);

    $(".end-button").on('click tap', finishClick);

    updateInfo({});

    saveAnswers();

    /**
     * Test ready. Start.
     */
    $("#test-instructions button#start-test").on('click tap', function (e) {
        if (!started) {

            var sounds = document.getElementsByTagName('audio');
            for(i=0; i<sounds.length; i++) sounds[i].pause();

            started = true;
            $("#test-instructions").hide();
            $("#test-container").removeClass("d-none");

            window.dispatchEvent(new CustomEvent('testStarted'));

            $("#hide-button").on("click tap", hideScreenModal);

            startTimer();

            startAudio();

            initContextMenu();
        }
    });
})();

function finishClick(event) {
    var responseStr = "You have selected to end this section of the test, click OK to progress to the next section or Cancel to return to the test.\n\nThis function is not available in the real computer-delivered IELTS test."
    if ($('textarea').length) {
        responseStr = "You have selected to end the familiarisation test, click OK to exit the test or Cancel to return to the Writing section.\n\nThis function is not available in the real computer-delivered IELTS test."
    }
    if (window.confirm(responseStr)) {
        finishTest();
    }
}

/**
 * @param event
 */
function updateInfo(event) {

    if ($(".question-buttons button.highlight").length === 0) {
        highlightFirstAnswer();
        $(".question-navigation .prev").prop('disabled', 'disabled');
    } else {

    }

    let desc = $(".exercise:not(.hidden)").attr("data-exercise-type-desc");
    if (desc) {
        $("#exercise-type-desc").html(desc);
    }
}

/**
 * @returns {boolean}
 */
function onLastExercise() {
    let last = $(".exercise:last-child")[0].getAttribute("data-exercise-id");
    let current = $(".exercise:not(.hidden)")[0].getAttribute("data-exercise-id");
    return last === current;
}

/**
 */
function nextToEnd() {
    $(".next-button").hide();
    $(".end-button").show();
}

/**
 */
function endToNext() {
    $(".next-button").show();
    $(".end-button").hide();
}

/**
 * @param event
 */
function markReview(event) {
    let active = $(".question-buttons:first-of-type button.highlight");

    if (active && (event.type === 'click' || event.type === 'tap')) {
        $(".question-buttons button.highlight").toggleClass("for-review");
    }

    if (active && active.hasClass('for-review')) {
        $(".review .check").addClass("checked");
    } else {
        $(".review .check").removeClass("checked");
    }
}

/**
 * @param event
 */
function handleAnswer(event) {
    if (handlingIt) return;
    handlingIt = true;

    if (event.target.nodeName === "INPUT" || event.target.nodeName === "input" || event.target.nodeName === "TEXTAREA") {
        if (event.target.getAttribute("type") === "text" || event.target.nodeName === "TEXTAREA") {
            if ($(event.target).val() !== "" && $(event.target).val() !== undefined) {
                let aId = event.target.getAttribute("data-answer-id");
                $(".question-buttons button[data-answer-id='" + aId + "']").addClass('answered');
            }
        } else {
            let qId = event.target.getAttribute("data-question-id");
            $(".question-buttons button[data-question-id='" + qId + "']").addClass('answered');
        }
    }
    saveAnswers();

    handlingIt = false;
}

/**
 * @param event
 */
function navigateAnswer(event) {
    if (event.target.hasAttribute("data-exercise-id")) {
        let exId = event.target.getAttribute("data-exercise-id");
        let part = event.target.getAttribute("data-part");

        switchPartByExercise(exId);

        focusOrScrollTo();

        window.dispatchEvent(new CustomEvent('questionNavigation'));
    }
}

function focusOrScrollTo() {
    let toFocus = $(".exercise .needs-focus").first();

    if (toFocus === undefined || toFocus === "undefined") {
        return;
    }

    let toScroll = function () {
        let targetClass = function () {
            if (toFocus.hasClass('answer')) {
                return 'answer';
            } else if (toFocus.hasClass('question-text')) {
                return 'question';
            }
        }() || '';
        if (targetClass) {
            let targetId = targetClass === 'question' ? toFocus.closest('.question').attr('id') : toFocus.attr('id');
            let parentExercise = toFocus.closest('.exercise');
            let targetChildren = parentExercise.find('.' + targetClass);
            let targetAnswer = targetChildren.first();
            if (targetId === targetAnswer.attr('id')) {
                return parentExercise;
            }
            if (targetClass === 'question') {
                let maybeSecondAnswer = targetChildren.eq(1);
                if (maybeSecondAnswer && (targetId === maybeSecondAnswer.attr('id'))) {
                    return parentExercise;
                }
            }
        }
    }() || toFocus;

    if (toFocus.attr("type") === "text" || toFocus.attr("type") === "textarea") {
        toFocus.one('focus', function (e) {
            e.preventDefault();
        });
        toFocus.focus();
    }

    toScroll[0].scrollIntoView({behavior: "smooth"});
}

/**
 * @param exId Exercise ID
 */
function switchPartByExercise(exId) {
    if (exId !== undefined && exId !== 0) {
        let exercise = $("#exercise-" + exId);
        let part = exercise.attr("data-test-part");
        switchPart(part);
    }
}

/**
 * @param part
 */
function switchPart(part) {
    if (part !== undefined && part !== 0) {
        let partExercises = $("*[data-test-part='" + part + "']");

        if (partExercises.hasClass("hidden")) {
            $("*[data-test-part]:not(.hidden)").addClass("hidden");
            partExercises.removeClass("hidden");
        }
    }
}

/**
 * @param id Exercise ID
 */
function switchExercise(id) {
    if (id !== undefined && id !== 0) {
        let exercise = $("#exercise-" + id);

        if (exercise.hasClass("hidden")) {
            $(".exercise:not(.hidden)").addClass("hidden");
            exercise.removeClass("hidden");
        }
    }
}

/**
 * @param event
 */
function toggleArrows(event) {
    let btn = $(".question-buttons:first-of-type button.highlight")[0];
    if (btn) {
        let currIndex = btn.getAttribute('data-index');
        let total = $(".arrows")[0].getAttribute("data-total-questions");
        let prev = $(".question-navigation .prev");
        let next = $(".question-navigation .next");
        if (currIndex === "1") {
            prev.prop('disabled', 'disabled');
            next.prop('disabled', '');
        } else if (currIndex === total) {
            prev.prop('disabled', '');
            next.prop('disabled', 'disabled');
        } else {
            prev.prop('disabled', '');
            next.prop('disabled', '');
        }
    }
}

/**
 * @param event
 */
function handleArrows(event) {
    let btn = $(".question-buttons:first-of-type button.highlight")[0];
    if (btn) {
        let currIndex = parseInt(btn.getAttribute('data-index'));
        if ($(event.currentTarget).hasClass('next')) {
            $(".question-buttons:first-of-type button[data-index='" + (currIndex + 1) + "']").click();
        } else if ($(event.currentTarget).hasClass('prev')) {
            $(".question-buttons:first-of-type button[data-index='" + (currIndex - 1) + "']").click();
        }

        window.dispatchEvent(new CustomEvent('questionNavigation'));
    }
}

function highlightFirstAnswer() {
    let firstQuestion = $(".exercise:not(.hidden) .answer").first()[0];
    highlight(firstQuestion);
}

function clearHighlight() {
    $(".question-text.highlight, .question-buttons button.highlight").removeClass("highlight");
}

/**
 * @param event
 */
function highlightAnswer(event) {
    if (handlingIt) return;
    handlingIt = true;

    clearHighlight();

    let target = $(event.target);
    highlight(target);

    window.dispatchEvent(new CustomEvent('questionHighlight'));

    handlingIt = false;
}

function highlight(element) {
    element = $(element);
    $(".needs-focus").removeClass("needs-focus");
    if (element.attr("type") === "radio" && element[0].hasAttribute("data-question-id")) {
        let qId = element.attr("data-question-id");
        $("#question-" + qId + " .question-text, .question-buttons button[data-question-id='" + qId + "']").addClass("highlight");
    } else if (element[0].hasAttribute("data-answer-id")) {
        let aId = element.attr("data-answer-id");
        $(".question-buttons button[data-answer-id='" + aId + "']").addClass("highlight");
        $("#answer-" + aId).addClass("needs-focus");
    } else if (element[0].hasAttribute("data-question-id")) {
        let qId = element.attr("data-question-id");
        $("#question-" + qId + " .question-text, .question-buttons button[data-question-id='" + qId + "']").addClass("highlight").addClass("needs-focus");

    }
}

function saveAnswers() {
    if (IS_FEEDBACK_MODE) {
        return;
    }

    let testId = $("#test")[0].getAttribute('data-test-id');
    let sessionId = $("#test")[0].getAttribute('data-session-id');
    let csrf = $('#csrf').attr('data-csrf');

    var answers = [];


    $(".answers input[type=radio]:checked, input[type=text], textarea").each(function (i, el) {
        var qId = el.getAttribute("data-question-id");
        var aId = el.getAttribute("data-answer-id");
        var value = $(el).val();

        answers.push({"question_id": qId, "answer_id": aId, "value": value});
    });

    let data = {
        "session_id": sessionId,
        "test_id": testId,
        "answers": answers
    };

    $.ajax({
        url: "/save",
        beforeSend: function (request) {
            request.setRequestHeader('X-CSRF-Token', csrf);
        },
        xhrFields: {
            withCredentials: true
        },
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        success: function (data) {
        },
        data: JSON.stringify(data)
    });
}

function finishTest() {
    saveAnswers();

    $("#test-ended-modal").modal({
        keyboard: false,
        backdrop: "static"
    }).on('shown.bs.modal', function (e) {
        setTimeout(function () {
            window.location.replace("/next");
        }, 7000);

        window.dispatchEvent(new CustomEvent('testFinished'));
    });
}

function startTimer() {
    if (IS_FEEDBACK_MODE) {
        return;
    }

    var time = parseInt($(".time")[0].getAttribute('data-limit')) * 60;

    var a = setInterval(function () {
        saveAnswers();
    }, 5000);

    var x = setInterval(function () {

        time = time - 1;

        var minutes = Math.ceil(time / 60);

        var preciseMinutes = Math.floor(time / 60);
        var seconds = time - preciseMinutes * 60;

        if (preciseMinutes === 9 && seconds === 59) {
            var flash = setInterval(function () {
                let timer = $(".timer");
                if (timer.hasClass("warning")) {
                    timer.removeClass("warning");
                } else {
                    timer.addClass("warning");
                }
            }, 800);
            setTimeout(function () {
                clearInterval(flash);
            }, 10000);
        }

        if (minutes <= 5) {
            $(".timer").addClass("warning");
        }

        if (preciseMinutes === 1 && seconds === 29) {
            if ($('#test').attr('data-test-type') === 'listening') {
                alert('The Listening test will automatically end when the clock reaches zero, to advance to the Reading test click the “Finish section” button now');
            }
        }

        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        if (minutes <= 1) {
            $(".minutes").html("");
            $(".time").html("0:" + time);

            $(".precise .minute").html("0");
            $(".precise .second").html(seconds);
        } else {
            $(".time").html(minutes);

            $(".precise .minute").html(preciseMinutes);
            $(".precise .second").html(seconds);
        }

        if (time === 0) {
            clearInterval(x);
            clearInterval(a);
            finishTest();
        }
    }, 1000);
}

function startAudio() {
    let audio = document.getElementById('audio');

    if (audio === null || audio.length === 0) {
        return;
    }

    audio.volume = .8;
    audio.currentTime = 0;

    if (!IS_FEEDBACK_MODE) {
        audio.play();
    }

    var drag = false;
    let volumeSlider = $("#volume");
    let volumeBar = $("#volume .volume-bar");
    volumeSlider.on('mousedown tap', function (e) {
        drag = true;
        adjustVolume(e.pageX);
    });

    $(document).on('mousemove', function (e) {
        if (drag) {
            adjustVolume(e.pageX);
        }
    });

    $(document).on('mouseup', function (e) {
        drag = false;
    });

    $(window).on('testFinished', function (e) {
        audio.pause();
    });

    /**
     * @param val
     */
    function adjustVolume(val) {
        let sliderWidth = volumeSlider.width();
        let relativeCursorPos = val - volumeSlider.offset().left;

        var percentage = 0;
        if (relativeCursorPos < 0) {
        } else if (relativeCursorPos >= sliderWidth) {
            percentage = 100
        } else {
            percentage = (relativeCursorPos / sliderWidth) * 100;
        }

        volumeBar.css('width', percentage + "%");
        audio.volume = percentage / 100;
    }
}

/**
 * @param event
 */
function exerciseNavigation(event) {
    let direction = $(event.target).hasClass("next-button") ? "next" : "prev";
    var exerciseIds = [];
    $.each($(".exercises .exercise"), function (i, el) {
        exerciseIds.push(el.getAttribute("data-exercise-id"));
    });

    if (exerciseIds) {
        let activeExercise = $(".exercise:not(.hidden)")[0].getAttribute("data-exercise-id");

        var last = false;

        exerciseIds.forEach(function (id, index) {
            if (id === activeExercise) {
                let dir = direction === "next" ? index + 1 : index - 1;
                if (exerciseIds[dir] !== undefined) {
                    last = false;
                    switchExercise(exerciseIds[dir]);
                    clearHighlight();
                    highlightFirstAnswer();

                    window.dispatchEvent(new CustomEvent('questionNavigation'));
                    window.dispatchEvent(new CustomEvent('questionHighlight'));
                } else {

                }
            }
        });
    }
}

function hideScreenModal() {
    $("#hide-screen-modal").modal({
        keyboard: false,
        backdrop: "static"
    });
}

function initContextMenu() {
    $.contextMenu({
        selector: '#region-main',
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
    Screen.mainSelector = '#region-main';


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
                if ($(trgtRng.startContainer).parent().closest('#region-main').length > 0) {
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
        return ($(range.startContainer.parentNode).closest('#region-main').length > 0) &&
            ($(range.endContainer.parentNode).closest('#region-main').length > 0);
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

    $('#region-main').on('mousedown', function (e) {
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

    $('#region-main').on('mouseup', '.' + highlightClass, function (event) {
        if (event.which === 1) {
            var rkey = getContextualRange(Screen.crntTarget);
            if (rkey && Screen.notes[rkey]) {
                $(Screen.notes[rkey].note).fadeIn();
            }
        }
    });

    $('#region-main').on('mouseover', '.' + highlightClass, function (event) {

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

    $('#region-main').on('mouseleave', '.' + highlightClass, function (event) {
        var htext = event.target,
            rkey = getContextualRange(htext);
        if (rkey && Screen.notes[rkey]) {
            $(htext).find('span.notesIcon').hide();
        }
    });

    $('#region-main').on('mouseout', '.notesIcon', function (event) {
        $(this).hide();
    });

    NotesOptions.highlightText = true;
}

