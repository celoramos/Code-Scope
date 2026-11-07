#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <stack>
#include <string>

int main() {
    // Coloque um breakpoint na linha abaixo e use F10 (step over).
    std::stack<int> pratos;
    std::queue<std::string> fila;
    std::set<int> vistos;
    std::map<std::string, int> idades;
    std::string nome = "Ana";
    pratos.push(1);
    pratos.push(2);
    fila.push("Bia");
    fila.push("Caio");
    vistos.insert(3);
    vistos.insert(3);
    idades[nome] = 20;
    pratos.pop();
    fila.pop();
    std::cout << pratos.size() << fila.size() << vistos.size() << idades[nome] << std::endl;
    return 0;
}
