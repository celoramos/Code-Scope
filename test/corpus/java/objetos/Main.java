package corpus.objetos;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

interface Forma {
    double area();
}

abstract class Animal {
    protected String nome;

    Animal(String nome) {
        this.nome = nome;
    }

    abstract String som();

    @Override
    public String toString() {
        return getClass().getSimpleName() + "(" + nome + ")";
    }
}

class Cachorro extends Animal {
    Cachorro(String nome) {
        super(nome);
    }

    String som() {
        return "au";
    }
}

record Ponto(int x, int y) {}

enum Planeta {
    TERRA(1.0), MARTE(0.38);

    final double gravidade;

    Planeta(double gravidade) {
        this.gravidade = gravidade;
    }
}

class Retangulo implements Forma {
    final double largura, altura;

    Retangulo(double largura, double altura) {
        this.largura = largura;
        this.altura = altura;
    }

    public double area() {
        return largura * altura;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Retangulo r && r.largura == largura && r.altura == altura;
    }

    @Override
    public int hashCode() {
        return Objects.hash(largura, altura);
    }
}

public class Main {
    static class Contador {
        int valor;
    }

    class Interna {
        int x = 1;
    }

    public static void main(String[] args) {
        Animal bicho = new Cachorro("Rex"); // @pare
        String som = bicho.som();
        Ponto p = new Ponto(1, 2);
        Ponto q = new Ponto(1, 2);
        boolean iguais = p.equals(q);
        Planeta planeta = Planeta.MARTE;
        double g = planeta.gravidade;
        Forma forma = new Retangulo(2, 3);
        double area = forma.area();
        Forma circulo = new Forma() {
            public double area() {
                return 3.14;
            }
        };
        double areaCirculo = circulo.area();
        Contador contador = new Contador();
        contador.valor++;
        Main externo = new Main();
        Interna interna = externo.new Interna();
        List<Animal> animais = new ArrayList<>();
        animais.add(bicho);
        animais.add(new Cachorro("Bob"));
        Runnable acao = () -> contador.valor += 10;
        acao.run();
        System.out.println(som + iguais + g + area + areaCirculo + contador.valor + interna.x + animais);
    } // @fim
}
