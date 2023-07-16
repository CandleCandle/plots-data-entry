

import toml from 'toml';
import { Character, Chapter, Link } from 'plots';
import FileSaver from 'file-saver';

let chapters = [];
let current_chapter = new Chapter();

function handleUpdateCharacterList(e) {
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
    current_chapter.item_number.major = Number(value);
}

function updateChapterNumber(value) {
    current_chapter.item_number.minor = Number(value);
}

function updateChapterSection(value) {
    current_chapter.item_number.patch = Number(value);
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
    document.getElementById('chapter-number').value = last_chapter.number;
    updateChapterNumber(last_chapter.number);
    document.getElementById('chapter-section').value = last_chapter.next_section_number();
    updateChapterSection(last_chapter.next_section_number());
    document.getElementById('chapter-title').value = last_chapter.title;
    updateChapterTitle(last_chapter.title);
    updateCharacterReport();
    updateToml();
}

function setupNextChapter() {
    let last_chapter = chapters[chapters.length-1];
    document.getElementById('book-number').value = last_chapter.book_number;
    updateBookNumber(last_chapter.book_number);
    document.getElementById('chapter-number').value = last_chapter.next_chapter_number();
    updateChapterNumber(last_chapter.next_chapter_number());
    document.getElementById('chapter-section').value = 0;
    updateChapterSection(0);
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

function handleChapterSection(event) {
    onEnter(event, e => {
        updateChapterSection(e.target.value);
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
        if(e.target.value && e.target.value.length >= 2) {
            let search = new RegExp('.*' + e.target.value + '.*', 'i');
            let locations_set = chapters
                .flatMap(chapter => {
                    let l = chapter.get_locations();
                    if (l) return l;
                    return [];
                })
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

function handleCharacterSearch(event) {
    onEnter(event, e => {
        let table = document.getElementById('character-table');
        if(e.target.value.length === 0) {
            clearCharacterSearch();
            return;
        }
        if(e.target.value && e.target.value.length >= 2) {
            let search = new RegExp('.*' + e.target.value + '.*', 'i');
            let characters_set = chapters
                .flatMap(chapter => chapter.get_present_characters())
                .filter(character => {
                    return character.name.match(search)
                        || character.get_previous_names().some(c => c.match(search))
                }).reduce((p, c) => {
                    if (!p.some(entry => entry.name === c.name)) p.unshift(c);
                    return p;
                }, []);
                let old_results = document.getElementById('character-search-results');
                let replacement = document.createElement('tbody');
                replacement.id = 'character-search-results';
                [...characters_set]
                    .sort(Character.CharacterName.compare)
                    .forEach(character => {
                        console.log('character search result: ', character);
                        let row = replacement.insertRow(-1);
                        let prev_names = character.get_previous_names()
                            .reduce((acc, cur) => {
                                if (!acc.includes(cur) && cur !== character.name) acc.push(cur);
                                return acc;
                            }, [])
                        row.insertCell(-1).textContent = character.name;
                        row.insertCell(-1).textContent = prev_names.join(', ');
                        row.insertCell(-1).textContent = character.get_theme();
                        row.insertCell(-1).textContent = character.notes;
                        let buttons = row.insertCell(-1);
                        buttons.appendChild(createCharacterAddButton(character));
                        buttons.appendChild(createCharacterEditButton(character));
                        buttons.appendChild(createCharacterRenameButton(character));
                    });
                table.replaceChild(replacement, old_results);
            }
        });
}

function createCharacterEditButton(character) {
    let button = document.createElement('button');
    button.textContent = 'Edit';
    button.addEventListener('click', e => {
        document.getElementById('character-add-name').value = character.name;
        document.getElementById('character-add-was').value = '';
        document.getElementById('character-add-theme').value = '';
        document.getElementById('character-add-notes').value = '';
        document.getElementById('character-add-theme').focus();
    });
    return button;
}

function createCharacterRenameButton(character) {
    let button = document.createElement('button');
    button.textContent = 'Rename';
    button.addEventListener('click', e => {
        document.getElementById('character-add-name').value = '';
        document.getElementById('character-add-was').value = character.name;
        document.getElementById('character-add-theme').value = '';
        document.getElementById('character-add-notes').value = '';
        document.getElementById('character-add-name').focus();
    });
    return button;
}

function createCharacterAddButton(character) {
    let button = document.createElement('button');
    button.textContent = 'Add';
    button.addEventListener('click', e => {
        current_chapter.with_present(new Character(character.name));
        updateToml();
        clearCharacterSearch();
        document.getElementById('character-search').value = '';
        document.getElementById('character-search').focus();
    });
    return button;
}

function clearCharacterSearch() {
    clearSearchResults('character-table', 'character-search-results');
}

function clearLocationSearch() {
    clearSearchResults('location-table', 'location-search-results');
}

function clearSearchResults(table_id, tbody_id) {
    let table = document.getElementById(table_id);
    let old_results = document.getElementById(tbody_id);
    let replacement = document.createElement('tbody');
    replacement.id = tbody_id;
    table.replaceChild(replacement, old_results);
}

function createLocationAddButton(location) {
    let button = document.createElement('button');
    button.textContent = 'Add';
    button.addEventListener('click', e => {
        current_chapter.add_location(location);
        updateToml();
        clearLocationSearch();
        document.getElementById('location-search').value = '';
        document.getElementById('location-search').focus();
    });
    return button;
}

function createLocationEditButton(location) {
    let button = document.createElement('button');
    button.textContent = 'Edit';
    button.addEventListener('click', e => {
        document.getElementById('location-new').value = location;
        document.getElementById('location-new').focus();
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
document.getElementById('chapter-section').addEventListener('keyup', handleChapterSection);
document.getElementById('chapter-section').addEventListener('focusout', handleChapterSection);
document.getElementById('next-secton').addEventListener('click', handleNextSection);
document.getElementById('next-chapter').addEventListener('click', handleNextChapter);
document.getElementById('character-add').addEventListener('click', handleAddNewCharacter);
document.getElementById('location-add').addEventListener('click', handleAddNewLocation);
document.getElementById('location-search').addEventListener('keyup', handleLocationSearch);
document.getElementById('character-search').addEventListener('keyup', handleCharacterSearch);
