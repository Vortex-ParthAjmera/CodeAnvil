import { describe, expect, it } from "vitest";
import { buildStructuralStoryboard } from "./storyboard";
import { traceIsValid } from "./validateTrace";
import { detectAndGenerate } from "./detect";

// The exact program the user pasted (a Python number-guessing game).
const GUESSING_GAME = `import random

def guessing_game():
    # Generate a random target number between 1 and 100
    secret_number = random.randint(1, 100)
    attempts = 0

    print("Welcome to the Number Guessing Game!")
    print("I have chosen a secret number between 1 and 100.")

    # Loop continuously until the user guesses correctly
    while True:
        try:
            # Prompt the user for an integer input
            guess = int(input("Enter your guess: "))
            attempts += 1

            # Evaluate the guess
            if guess < secret_number:
                print("Too low! Try again.")
            elif guess > secret_number:
                print("Too high! Try again.")
            else:
                print(f"Congratulations! You guessed the number in {attempts} attempts!")
                break # Exit the loop when correct

        except ValueError:
            print("Invalid input. Please enter a valid whole number.")

# Execute the game function
if __name__ == "__main__":
    guessing_game()
`;

describe("buildStructuralStoryboard — construct tour", () => {
  it("narrates every construct in the guessing game", () => {
    const { trace } = buildStructuralStoryboard(GUESSING_GAME, "python");
    expect(traceIsValid(trace)).toBe(true);

    const events = trace.steps.map((s) => s.event);
    expect(events).toContain("import"); // import random
    expect(events).toContain("define_function"); // def guessing_game()
    expect(events).toContain("assign"); // secret_number / attempts
    expect(events).toContain("write_output"); // Welcome / chosen a secret / Too low / …
    expect(events).toContain("enter_loop"); // while True
    expect(events).toContain("enter_guard"); // try:
    expect(events).toContain("read_input"); // input("Enter your guess: ")
    expect(events).toContain("branch"); // if / elif / else
    expect(events).toContain("exit_loop"); // break
    expect(events).toContain("handle_error"); // except ValueError
    expect(events).toContain("entry_point"); // if __name__ == "__main__"
    expect(events).toContain("call_function"); // guessing_game()
    expect(events).toContain("program_start");
    expect(events).toContain("program_end");
  });

  it("flags the program as interactive and non-deterministic", () => {
    const { summary } = buildStructuralStoryboard(GUESSING_GAME, "python");
    expect(summary.interactive).toBe(true);
    expect(summary.nondeterministic).toBe(true);
    expect(summary.functions).toBe(1);
    expect(summary.loops).toBe(1);
    expect(summary.reads).toBe(1);
    expect(summary.writes).toBe(6);
    expect(summary.guards).toBe(2); // try + except
  });

  it("collects console output into steps", () => {
    const { trace } = buildStructuralStoryboard(GUESSING_GAME, "python");
    const firstWrite = trace.steps.find((s) => s.event === "write_output");
    expect(firstWrite?.output).toContain("Welcome to the Number Guessing Game!");
  });

  it("stays honest: descriptions never claim execution", () => {
    const { trace } = buildStructuralStoryboard(GUESSING_GAME, "python");
    const readStep = trace.steps.find((s) => s.event === "read_input");
    expect(readStep?.description).toMatch(/Not executed during playback/);
    expect(trace.steps[trace.steps.length - 1].description).toMatch(/nothing was executed|walkthrough/i);
  });

  it("handles plain unknown code without construct noise", () => {
    const code = "// a lone comment\nlet total = 0;\ntotal += 2;\nconsole.log(total);";
    const { trace, summary } = buildStructuralStoryboard(code, "javascript");
    expect(traceIsValid(trace)).toBe(true);
    expect(summary.interactive).toBe(false);
    expect(summary.nondeterministic).toBe(false);
    expect(trace.steps.map((s) => s.event)).toEqual([
      "program_start",
      "comment",
      "assign",
      "assign",
      "write_output",
      "program_end",
    ]);
  });
});

describe("detectAndGenerate — storyboard fallback", () => {
  it("uses the construct tour for the guessing game and flags interactivity in the note", () => {
    const res = detectAndGenerate(GUESSING_GAME);
    expect(res.kind).toBe("storyboard");
    expect(res.trace).toBeDefined();
    expect(traceIsValid(res.trace!)).toBe(true);
    expect(res.note).toMatch(/interactive/i);
    // The old line-by-line fallback is gone: no dumb "Line N:" steps.
    const dumbSteps = res.trace!.steps.filter((s) => s.event === "line_enter");
    expect(dumbSteps).toHaveLength(0);
  });
});
