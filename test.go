package main

import "fmt"

type MyStruct struct {
	Name string
}

func (m *MyStruct) SayHello() {
	fmt.Printf("Hello, %s\n", m.Name)
}

func main() {
	m := MyStruct{Name: "World"}
	m.SayHello()
}
