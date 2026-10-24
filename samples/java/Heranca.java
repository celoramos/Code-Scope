public class Heranca {
    static class Animal {
        String nome;

        Animal(String nome) {
            this.nome = nome;
        }

        String falar() {
            return "...";
        }
    }

    static class Cachorro extends Animal {
        Cachorro(String nome) {
            super(nome);
        }

        @Override
        String falar() {
            return "Au!";
        }
    }

    static class Gato extends Animal {
        Gato(String nome) {
            super(nome);
        }

        @Override
        String falar() {
            return "Miau!";
        }
    }

    public static void main(String[] args) {
        Animal[] bichos = {new Cachorro("Rex"), new Gato("Mia"), new Animal("Bob")};
        // Coloque um breakpoint na linha abaixo e use F11 (step into) para ver qual falar() roda.
        for (int i = 0; i < bichos.length; i++) {
            String som = bichos[i].falar();
            System.out.println(bichos[i].nome + ": " + som);
        }
    }
}
