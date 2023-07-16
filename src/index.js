

import toml from 'toml';
import { Character, Chapter, Link } from 'plots';
import FileSaver from 'file-saver';

let chapters = [];
let current_chapter = new Chapter();

function handleUpdateCharacterList(e) {
    let f = e.target.files[0];
    if (e.target.files.length === 0) return;
    let arr = [];
    for (let i = 0; i < e.target.files.length; ++i) {
        arr.push(e.target.files[i]);
    }

    let promises = arr.map(name => {
        return new Promise( (resolve, reject) => {
            let fr = new FileReader();
            fr.onload = (e) => resolve(Chapter.from_object(toml.parse(e.target.result)));
            fr.onerror = reject;
            fr.readAsText(name);
        } );
    });
    Promise.all(promises)
        .then((chaps) => {
            chapters = chaps.sort(Chapter.BookNumber.then(Chapter.ChapterNumber).compare)
                .reduce((acc, current) => {
                    if (acc.length === 0) {
                        acc.push(current);
                    } else {
                        acc.push(current.with_previous_chapter(acc[acc.length-1]));
                    }
                    return acc;
                }, []);
            updateCharacterReport();
        });

}

function updateCharacterReport() {
    let characters_report = Object.entries(chapters[chapters.length-1].get_report('all-characters').data_obj())
        .sort((a, b) => {
            if (a[1][0] != b[1][0]) return a[1][0] - b[1][0]; // "book"
            if (a[1][1] != b[1][1]) return a[1][1] - b[1][1]; // "chapter"
            return a[0].localeCompare(b[0]); // "name"
        })
        .map((item) => item[0] + " => " + "book: " + item[1][0] + " chapter: " + item[1][1])
        .reduce((p, c) => {
            let r = p;
            if (p !== "") r += "\n";
            r += c
            return r
        }, "");
    document.getElementById('character-list').textContent = characters_report
}

function updateBookNumber(value) {
    current_chapter.book_number = Number(value);
}

function updateChapterNumber(value) {
    current_chapter.order = Number(value);
}

function updateChapterTitle(value) {
    current_chapter.title = value;
}

function updateToml() {
    console.log('update toml', 'current chapter: ', current_chapter);
    document.getElementById('current-toml').value = current_chapter.to_toml();
}

function onEnter(e, cb) {
    if (e.type === 'keyup') {
        if (e.key === 'Enter') {
            cb(e);
        }
    } else {
        cb(e);
    }
}

function downloadToml() {
    let blob = new Blob([document.getElementById('current-toml').value], {type: "text/plain;charset=utf-8"});
    console.log('download toml', 'current chapter: ', current_chapter);
    FileSaver.saveAs(blob, current_chapter.make_toml_filename());
}

function resetForm() {
    if (chapters.length > 0) {
        current_chapter.with_previous_chapter(chapters[chapters.length-1]);
    }
    chapters.push(current_chapter);
    current_chapter = new Chapter();
    current_chapter.title = '';
    [
        'book-number', 'chapter-number', 'chapter-title', 'current-toml'
    ].forEach(e => {
        document.getElementById(e).value = '';
    });
}

function setupNextSection() {
    let last_chapter = chapters[chapters.length-1];
    document.getElementById('book-number').value = last_chapter.book_number;
    updateBookNumber(last_chapter.book_number);
    document.getElementById('chapter-number').value = last_chapter.order + 0.1;
    updateChapterNumber(last_chapter.order + 0.1);
    document.getElementById('chapter-title').value = last_chapter.title;
    updateChapterTitle(last_chapter.title);
    updateCharacterReport();
    updateToml();
}

function setupNextChapter() {
    let last_chapter = chapters[chapters.length-1];
    document.getElementById('book-number').value = last_chapter.book_number;
    updateBookNumber(last_chapter.book_number);
    document.getElementById('chapter-number').value = Math.floor(last_chapter.order) + 1;
    updateChapterNumber(Math.floor(last_chapter.order) + 1);
    updateCharacterReport();
    updateToml();
}

function handleAddNewCharacter(event) {
    let char = new Character(
        document.getElementById('character-add-name').value,
        document.getElementById('character-add-theme').value,
        document.getElementById('character-add-notes').value,
        document.getElementById('character-add-was').value
    );
    current_chapter.with_present(char);
    document.getElementById('character-add-name').value = '';
    document.getElementById('character-add-theme').value = '';
    document.getElementById('character-add-notes').value = '';
    document.getElementById('character-add-was').value = '';
    updateToml();
}

function handleAddNewLocation(event) {
    current_chapter.add_location(document.getElementById('location-new').value);
    document.getElementById('location-new').value = '';
    updateToml();
    clearLocationSearch();
}

function handleNextSection(event) {
    downloadToml();
    resetForm();
    setupNextSection();
}

function handleNextChapter(event) {
    downloadToml();
    resetForm();
    setupNextChapter();
}

function handleBookNumber(event) {
    onEnter(event, e => {
        updateBookNumber(e.target.value);
        updateToml();
    });
}

function handleChapterNumber(event) {
    onEnter(event, e => {
        updateChapterNumber(e.target.value);
        updateToml()
    });
}

function handleChapterTitle(event) {
    onEnter(event, e => {
        updateChapterTitle(e.target.value);
        updateToml();
    });
}

function handleLocationSearch(event) {
    onEnter(event, e => {
        let table = document.getElementById('location-table');
        if(e.target.value.length === 0) {
            clearLocationSearch();
            return;
        }
        if(e.target.value && e.target.value.length >= 3) {
            let search = new RegExp('.*' + e.target.value + '.*', 'i');
            let locations_set = chapters
                .flatMap(chapter => chapter.get_locations())
                .filter(location => {
                    return location.match(search);
                }).reduce((p, c) => {p.add(c); return p;}, new Set());
            let old_results = document.getElementById('location-search-results');
            let replacement = document.createElement('tbody');
            replacement.id = 'location-search-results';
            [...locations_set]
                .sort((a, b) => a.localeCompare(b))
                .forEach(location => {
                    console.log('location search result: ', location);
                    let row = replacement.insertRow(-1);
                    row.insertCell(-1).textContent = location;
                    let buttons = row.insertCell(-1);
                    buttons.appendChild(createLocationAddButton(location));
                    buttons.appendChild(createLocationEditButton(location));
                });
            table.replaceChild(replacement, old_results);
        }
    });
}

function clearLocationSearch() {
    let table = document.getElementById('location-table');
    let old_results = document.getElementById('location-search-results');
    let replacement = document.createElement('tbody');
    replacement.id = 'location-search-results';
    table.replaceChild(replacement, old_results);
}

function createLocationAddButton(location) {
    let button = document.createElement('button');
    button.textContent = 'Add';
    button.addEventListener('click', e => {
        current_chapter.add_location(location);
        updateToml();
        clearLocationSearch();
    });
    return button;
}

function createLocationEditButton(location) {
    let button = document.createElement('button');
    button.textContent = 'Edit';
    button.addEventListener('click', e => {
        document.getElementById('location-new').value = location;
    });
    return button;
}

document.getElementById('toml-selection').addEventListener('change', handleUpdateCharacterList, false);
document.getElementById('book-number').addEventListener('keyup', handleBookNumber);
document.getElementById('book-number').addEventListener('focusout', handleBookNumber);
document.getElementById('chapter-number').addEventListener('keyup', handleChapterNumber);
document.getElementById('chapter-number').addEventListener('focusout', handleChapterNumber);
document.getElementById('chapter-title').addEventListener('keyup', handleChapterTitle);
document.getElementById('chapter-title').addEventListener('focusout', handleChapterTitle);
document.getElementById('next-secton').addEventListener('click', handleNextSection);
document.getElementById('next-chapter').addEventListener('click', handleNextChapter);
document.getElementById('character-add').addEventListener('click', handleAddNewCharacter);
document.getElementById('location-add').addEventListener('click', handleAddNewLocation);
document.getElementById('location-search').addEventListener('keyup', handleLocationSearch);
