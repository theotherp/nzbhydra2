package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.Random;
import java.util.function.BiConsumer;
import java.util.function.Function;

/**
 * A behaviour that yields an RSS root, so that decorators can compose before the root is wrapped into a response entity.
 */
@FunctionalInterface
public interface RootBehaviour extends ResponseBehaviour {

    NewznabXmlRoot buildRoot(MockContext context) throws Exception;

    @Override
    default ResponseEntity<?> respond(MockContext context) throws Exception {
        return new ResponseEntity<>(buildRoot(context), HttpStatus.OK);
    }

    default RootBehaviour withTotal(int total) {
        return withTotal(context -> total);
    }

    default RootBehaviour withTotal(Function<MockContext, Integer> total) {
        return context -> {
            NewznabXmlRoot root = buildRoot(context);
            root.getRssChannel().getNewznabResponse().setTotal(total.apply(context));
            return root;
        };
    }

    /**
     * Sets the API limits when the function returns any, which lets the "does this indexer report limits" decision live
     * in one place.
     */
    default RootBehaviour withApiLimits(Function<MockContext, NewznabXmlApilimits> apiLimits) {
        return context -> {
            NewznabXmlRoot root = buildRoot(context);
            NewznabXmlApilimits limits = apiLimits.apply(context);
            if (limits != null) {
                root.getRssChannel().setApiLimits(limits);
            }
            return root;
        };
    }

    default RootBehaviour mutateItems(BiConsumer<MockContext, NewznabXmlItem> mutation) {
        return context -> {
            NewznabXmlRoot root = buildRoot(context);
            for (NewznabXmlItem item : root.getRssChannel().getItems()) {
                mutation.accept(context, item);
            }
            return root;
        };
    }

    default RootBehaviour mutateRoot(BiConsumer<MockContext, NewznabXmlRoot> mutation) {
        return context -> {
            NewznabXmlRoot root = buildRoot(context);
            mutation.accept(context, root);
            return root;
        };
    }

    default ResponseBehaviour withStatus(Function<MockContext, HttpStatus> status) {
        return context -> new ResponseEntity<>(buildRoot(context), status.apply(context));
    }

    /**
     * The torznab post-processing of the original {@code torznabapi} method.
     */
    default RootBehaviour torznab() {
        return context -> {
            NewznabXmlRoot root = buildRoot(context);
            root.getRssChannel().setNewznabResponse(null);
            Random random = context.random();
            for (NewznabXmlItem item : root.getRssChannel().getItems()) {
                item.setNewznabAttributes(new ArrayList<>());
                item.getTorznabAttributes().add(new NewznabAttribute("seeders", String.valueOf(random.nextInt(30000))));
                item.getTorznabAttributes().add(new NewznabAttribute("peers", String.valueOf(random.nextInt(30000))));
                item.getTorznabAttributes().add(new NewznabAttribute("uploadvolumefactor", "1.0"));
                if (random.nextInt(5) == 3) {
                    item.getTorznabAttributes().add(new NewznabAttribute("downloadvolumefactor", "0"));
                } else {
                    item.getTorznabAttributes().add(new NewznabAttribute("downloadvolumefactor", String.valueOf(random.nextFloat())));
                }
                if (random.nextInt(5) > 3) {
                    item.getTorznabAttributes().add(new NewznabAttribute("grabs", String.valueOf(random.nextInt(30000))));
                }
                item.setCategory("5000");
                item.setGrabs(null);
            }
            return root;
        };
    }

}
