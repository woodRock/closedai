package main

import "testing"

func TestAdd(t *testing.T) {
    result := 1 + 1
    if result != 2 {
        t.Errorf("Expected 2, got %d", result)
    }
}
