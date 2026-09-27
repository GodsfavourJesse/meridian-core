import { randomInt } from "node:crypto";

const MIYOR_NUMBER_LENGTH = 9;

export function generateMiyorNumber(): string {
    const firstDigit = randomInt(1, 10);

    let number = String(firstDigit);

    while (
        number.length <
        MIYOR_NUMBER_LENGTH
    ) {
        number += String(
            randomInt(0, 10)
        );
    }

    return number;
}