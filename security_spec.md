# NutriSnap Security Specification

## 1. Data Invariants
- Each user can only read, create, update, and delete documents within their own `/users/{userId}` hierarchy.
- A user cannot read or tamper with another user's logged meals or goals.
- Unauthenticated requests are completely rejected.
- `userId` on Meal and Goal documents must strictly match `request.auth.uid`.
- Document IDs must conform to `isValidId()` (alphanumeric, hyphens, underscores, length <= 128).
- Nutrition values (calories, protein, carbs, fat) must be non-negative numbers.

## 2. The Dirty Dozen Attack Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user123/meals/meal1` with `request.auth == null` -> DENY.
2. **Cross-User Snooping**: `user_alice` attempts to read `/users/user_bob/meals/meal2` -> DENY.
3. **Cross-User Meal Injection**: `user_alice` attempts to create `/users/user_bob/meals/meal3` -> DENY.
4. **Spoofed Owner Field**: `user_alice` creates `/users/user_alice/meals/meal4` with `userId: 'user_bob'` -> DENY.
5. **Path ID Poisoning**: Document ID containing directory traversal or junk characters `../admin` -> DENY.
6. **Negative Calories**: Creating a meal with `calories: -500` -> DENY.
7. **Negative Protein**: Creating a meal with `protein: -20` -> DENY.
8. **Negative Carbs**: Creating a meal with `carbs: -100` -> DENY.
9. **Negative Fat**: Creating a meal with `fat: -50` -> DENY.
10. **Excessive String Payload**: Injecting an oversized 1MB string in `mealName` -> DENY.
11. **Altering Meal Owner on Update**: Modifying `userId` from `user_alice` to `user_bob` -> DENY.
12. **Catch-All Root Access**: Attempting to list all root `/users` without owning the documents -> DENY.
