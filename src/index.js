

import toml from 'toml';
import { Character, Chapter, Link } from 'plots';
import FileSaver from 'file-saver';

let chapters = [];
let current_chapter = new Chapter();

function updateCharacterList(e) {
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
    console.log('update book num', 'current chapter: ', current_chapter);
    current_chapter.book_number = Number(value);
}

function updateChapterNumber(value) {
    console.log('update chapter num', 'current chapter: ', current_chapter);
    current_chapter.order = Number(value);
}

function updateChapterTitle(value) {
    console.log('update chapter title', 'current chapter: ', current_chapter);
    current_chapter.title = value;
}

function updateToml() {
    console.log('update toml', 'current chapter: ', current_chapter);
    document.getElementById('current-toml').value = current_chapter.to_toml();
}

function onEnter(e, cb) {
    if (e.key === 'Enter') {
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
        'book-number', 'chapter-number', 'chapter-title'
    ].forEach(e => {
        document.getElementById(e).value = '';
    });
}

function setupNextSection() {
    let last_chapter = chapters[chapters.length-1];
    console.log('setup next sect', 'current chapter: ', last_chapter);
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
    console.log('setup next chap', 'current chapter: ', last_chapter);
    document.getElementById('book-number').value = last_chapter.book_number;
    updateBookNumber(last_chapter.book_number);
    document.getElementById('chapter-number').value = Math.floor(last_chapter.order) + 1;
    updateChapterNumber(Math.floor(last_chapter.order) + 1);
    updateToml();
}

document.getElementById('toml-selection')
    .addEventListener('change', updateCharacterList, false);

document.getElementById('book-number')
    .addEventListener('keyup', (e) => onEnter(e, (e) => { updateBookNumber(e.target.value); updateToml(); }));

document.getElementById('chapter-number')
    .addEventListener('keyup', (e) => onEnter(e, (e) => { updateChapterNumber(e.target.value); updateToml(); }));

document.getElementById('chapter-title')
    .addEventListener('keyup', (e) => onEnter(e, (e) => { updateChapterTitle(e.target.value); updateToml(); }));

document.getElementById('next-secton')
    .addEventListener('click', (e) => { downloadToml(); resetForm(); setupNextSection(); })

document.getElementById('next-chapter')
    .addEventListener('click', (e) => { downloadToml(); resetForm(); setupNextChapter(); })

// document.getElementById('chapter-number')
// .addEventListener('keyup', (e) => onEnter(e, (e) => { updateChapterNumber(e.target.value); updateToml() }));
