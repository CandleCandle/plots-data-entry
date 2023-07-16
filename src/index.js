

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
        });

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
    updateToml();
}

function setupNextChapter() {
    let last_chapter = chapters[chapters.length-1];
    document.getElementById('book-number').value = last_chapter.book_number;
    updateBookNumber(last_chapter.book_number);
    document.getElementById('chapter-number').value = Math.floor(last_chapter.order) + 1;
    updateChapterNumber(Math.floor(last_chapter.order) + 1);
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
    onEnter(event, (e) => {
        updateBookNumber(e.target.value);
        updateToml();
    });
}

function handleChapterNumber(event) {
    onEnter(event, (e) => {
        updateChapterNumber(e.target.value);
        updateToml()
    });
}

function handleChapterTitle(event) {
    onEnter(event, (e) => {
        updateChapterTitle(e.target.value);
        updateToml();
    });
}

document.getElementById('toml-selection').addEventListener('change', handleUpdateCharacterList, false);
document.getElementById('book-number').addEventListener('keyup', handleBookNumber);
document.getElementById('book-number').addEventListener('focusout', handleBookNumber);
document.getElementById('chapter-number').addEventListener('keyup', handleChapterNumber);
document.getElementById('chapter-number').addEventListener('focusout', handleChapterNumber);
document.getElementById('chapter-title').addEventListener('keyup', handleChapterTitle);
document.getElementById('chapter-title').addEventListener('focusout', handleChapterTitle);
document.getElementById('next-secton').addEventListener('click', handleNextSection)
document.getElementById('next-chapter').addEventListener('click', handleNextChapter)
document.getElementById('character-add').addEventListener('click', handleAddNewCharacter)
document.getElementById('location-add').addEventListener('click', handleAddNewLocation)
