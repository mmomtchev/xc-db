export function scrollIntoViewIfNeeded(target: HTMLElement) {
    if (target.getBoundingClientRect().bottom > window.innerHeight) {
        target.scrollIntoView({block: 'end', inline: 'nearest', behavior: 'smooth'});
    }

    if (target.getBoundingClientRect().top < 0) {
        target.scrollIntoView({block: 'start', inline: 'nearest', behavior: 'smooth'});
    }
}
