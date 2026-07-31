import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import getLocalisation from '../../../localisation';
import { Context } from '../../../store';

const FeatureDiscovery: FunctionalComponent = () => {
  const { store } = useContext(Context);

  if (!store.featureDiscoveryVisible) {
    return null;
  }

  return (
    <section className="feature-discovery">
      <h2 className="feature-discovery__heading feature-discovery__heading--timer">{getLocalisation().linearFeatureDiscoveryButton}</h2>
      {/*
      <h2
        className="feature-discovery__heading feature-discovery__heading--settings"
      >
        {getLocalisation().linearFeatureDiscoverySettings}
      </h2>
      */}
    </section>
  );
};

export default FeatureDiscovery;
