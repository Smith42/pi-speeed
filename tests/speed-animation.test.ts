import { describe, expect, it } from "vitest";
import { SpeedAnimator } from "../src/speed-animation";

describe("SpeedAnimator", () => {
	it("eases from the previous displayed value to the new target", () => {
		const animator = new SpeedAnimator(2000);
		animator.reset(45.6, 0);
		animator.setTarget(20.4, 0);

		expect(animator.value(0)).toBeCloseTo(45.6);
		expect(animator.value(1000)).toBeCloseTo(33.0);
		expect(animator.value(2000)).toBeCloseTo(20.4);
	});

	it("restarts from the current displayed value when a new target arrives", () => {
		const animator = new SpeedAnimator(2000);
		animator.reset(45.6, 0);
		animator.setTarget(20.4, 0);
		animator.setTarget(60, 1000);

		expect(animator.value(1000)).toBeCloseTo(33.0);
		expect(animator.value(2000)).toBeCloseTo(46.5);
		expect(animator.value(3000)).toBeCloseTo(60);
	});

	it("clears the display when the target is unavailable", () => {
		const animator = new SpeedAnimator(2000);
		animator.reset(10, 0);
		animator.setTarget(null, 100);

		expect(animator.value(100)).toBeNull();
		expect(animator.isAnimating(100)).toBe(false);
	});
});
