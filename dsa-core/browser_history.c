/*
 * Web Browser History Management System
 * ----------------------------------------------------------
 * DSA Mini Project — implemented using a DOUBLY LINKED LIST
 *
 * Operations:
 *   visit(url)    -> O(1)    insert a new page after current,
 *                             discard everything ahead of it
 *   back(steps)   -> O(steps) move toward head along prev pointers
 *   forward(steps)-> O(steps) move toward tail along next pointers
 *
 * Compile : gcc browser_history.c -o browser_history
 * Run     : ./browser_history
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_URL_LEN 100

/* ---------- Node of the doubly linked list ---------- */
typedef struct Node {
    char url[MAX_URL_LEN];
    struct Node *prev;
    struct Node *next;
} Node;

/* ---------- The browser history "list" ---------- */
typedef struct {
    Node *head;    /* oldest page visited   */
    Node *current; /* the page shown right now */
} BrowserHistory;

/* Create a new node holding the given url */
Node* createNode(const char *url) {
    Node *node = (Node*) malloc(sizeof(Node));
    if (!node) {
        printf("Memory allocation failed!\n");
        exit(1);
    }
    strncpy(node->url, url, MAX_URL_LEN - 1);
    node->url[MAX_URL_LEN - 1] = '\0';
    node->prev = NULL;
    node->next = NULL;
    return node;
}

/* Initialise the browser with a homepage -> O(1) */
void init(BrowserHistory *bh, const char *homepage) {
    Node *home = createNode(homepage);
    bh->head = home;
    bh->current = home;
}

/*
 * visit(url) -> O(1)
 * Inserts a new node right after "current" and drops everything
 * that used to come after it (the old forward history), exactly
 * like a real browser does when you navigate somewhere new.
 */
void visit(BrowserHistory *bh, const char *url) {
    /* free every node that was ahead of current (old forward branch) */
    Node *toDelete = bh->current->next;
    while (toDelete != NULL) {
        Node *next = toDelete->next;
        free(toDelete);
        toDelete = next;
    }

    Node *node = createNode(url);
    node->prev = bh->current;
    bh->current->next = node;
    bh->current = node;

    printf("Visited: %s\n", url);
}

/*
 * back(steps) -> O(steps)
 * Moves "current" toward head along prev pointers, stopping at
 * the oldest page if steps is larger than the available history.
 */
void back(BrowserHistory *bh, int steps) {
    int moved = 0;
    while (moved < steps && bh->current->prev != NULL) {
        bh->current = bh->current->prev;
        moved++;
    }
    printf("Back %d step(s) -> now at: %s\n", moved, bh->current->url);
}

/*
 * forward(steps) -> O(steps)
 * Moves "current" toward the newest page along next pointers.
 */
void forward(BrowserHistory *bh, int steps) {
    int moved = 0;
    while (moved < steps && bh->current->next != NULL) {
        bh->current = bh->current->next;
        moved++;
    }
    printf("Forward %d step(s) -> now at: %s\n", moved, bh->current->url);
}

/* Print the full chain (head -> tail), marking the current node -> O(n) */
void printHistory(BrowserHistory *bh) {
    Node *node = bh->head;
    int index = 0;
    printf("\nHistory chain:\n");
    while (node != NULL) {
        if (node == bh->current)
            printf("  [%d] %s   <-- current\n", index, node->url);
        else
            printf("  [%d] %s\n", index, node->url);
        node = node->next;
        index++;
    }
    printf("\n");
}

/* Free every node in the list (call once, before the program exits) */
void freeHistory(BrowserHistory *bh) {
    Node *node = bh->head;
    while (node != NULL) {
        Node *next = node->next;
        free(node);
        node = next;
    }
    bh->head = NULL;
    bh->current = NULL;
}

/* ---------- Menu-driven demo ---------- */
int main() {
    BrowserHistory bh;
    char homepage[MAX_URL_LEN];
    int choice, steps;
    char url[MAX_URL_LEN];

    printf("=== Web Browser History Management System (Doubly Linked List) ===\n");
    printf("Enter homepage URL: ");
    scanf("%99s", homepage);
    init(&bh, homepage);

    do {
        printf("\n---------- MENU ----------\n");
        printf("1. Visit a new URL\n");
        printf("2. Go Back\n");
        printf("3. Go Forward\n");
        printf("4. Show current page\n");
        printf("5. Show full history chain\n");
        printf("6. Exit\n");
        printf("Enter choice: ");
        scanf("%d", &choice);

        switch (choice) {
            case 1:
                printf("Enter URL to visit: ");
                scanf("%99s", url);
                visit(&bh, url);
                break;

            case 2:
                printf("Enter number of steps to go back: ");
                scanf("%d", &steps);
                back(&bh, steps);
                break;

            case 3:
                printf("Enter number of steps to go forward: ");
                scanf("%d", &steps);
                forward(&bh, steps);
                break;

            case 4:
                printf("Current page: %s\n", bh.current->url);
                break;

            case 5:
                printHistory(&bh);
                break;

            case 6:
                printf("Exiting... freeing memory.\n");
                break;

            default:
                printf("Invalid choice! Try again.\n");
        }
    } while (choice != 6);

    freeHistory(&bh);
    return 0;
}
